const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');
const aiRecommendations = require('../services/aiRecommendations');

const router = express.Router();

router.use(authenticate, requireAccess);

// GET /api/recommendations - Get personalized recommendations
router.get('/', async (req, res) => {
  try {
    const { studyRecommendations, flashcards, publicDeckLibrary, users } = getDatabase();

    // Get non-dismissed recommendations for user
    let recommendations = await studyRecommendations
      .find({ user_id: req.user.id, dismissed: false })
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();

    // If not enough recommendations, generate new ones
    if (recommendations.length < 3) {
      const newRecommendations = await generateRecommendations(req.user.id);
      recommendations = [...recommendations, ...newRecommendations].slice(0, 5);
    }

    // Fetch details for each recommendation
    const detailed = await Promise.all(
      recommendations.map(async rec => {
        let targetName = rec.target_name;
        let targetDesc = '';

        if (rec.type === 'deck') {
          const deck = await publicDeckLibrary.findOne({ _id: rec.target_id });
          if (deck) {
            targetName = deck.title;
            targetDesc = deck.description;
          }
        }

        return {
          id: rec._id,
          type: rec.type,
          reason: rec.reason,
          target_name: targetName,
          target_description: targetDesc,
          confidence: rec.confidence,
          clicked: rec.clicked || false,
          created_at: rec.created_at,
        };
      })
    );

    res.json({ recommendations: detailed });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Erro ao buscar recomendações' });
  }
});

// POST /api/recommendations/:id/dismiss - Dismiss recommendation
router.post('/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    const { studyRecommendations } = getDatabase();

    const now = new Date().toISOString();
    await studyRecommendations.updateOne(
      { _id: id, user_id: req.user.id },
      {
        $set: {
          dismissed: true,
          dismissed_at: now,
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Dismiss recommendation error:', error);
    res.status(500).json({ error: 'Erro ao descartar recomendação' });
  }
});

// POST /api/recommendations/:id/click - Track recommendation click
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    const { studyRecommendations } = getDatabase();

    await studyRecommendations.updateOne(
      { _id: id, user_id: req.user.id },
      { $set: { clicked: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Click recommendation error:', error);
    res.status(500).json({ error: 'Erro ao registrar clique' });
  }
});

// Helper function to generate recommendations
async function generateRecommendations(userId) {
  const {
    users,
    flashcards,
    publicDeckLibrary,
    mockExams,
    studyRecommendations,
    questionAttempts,
  } = getDatabase();

  const user = await users.findOne({ _id: userId });
  if (!user) return [];

  const recommendations = [];
  const now = new Date().toISOString();

  try {
    // Build user analysis from study data
    const userCards = await flashcards.find({ user_id: userId }).toArray();
    const attempts = await questionAttempts.find({ user_id: userId }).toArray();

    // Calculate subject accuracy
    const subjectAccuracy = {};
    attempts.forEach(attempt => {
      const subject = attempt.subject || 'Geral';
      if (!subjectAccuracy[subject]) {
        subjectAccuracy[subject] = { correct: 0, total: 0 };
      }
      subjectAccuracy[subject].total += 1;
      if (attempt.is_correct) subjectAccuracy[subject].correct += 1;
    });

    // Convert to percentages
    const accuracyBySubject = {};
    Object.entries(subjectAccuracy).forEach(([subject, stats]) => {
      accuracyBySubject[subject] = Math.round((stats.correct / stats.total) * 100);
    });

    // Prepare user stats for analysis
    const userStats = {
      subjectAccuracy: accuracyBySubject,
      totalFlashcardsReviewed: userCards.length,
      totalTimeMinutes: userCards.reduce((sum, card) => sum + (card.review_time_minutes || 0), 0),
      overallAccuracy: Object.values(accuracyBySubject).length > 0
        ? Math.round(Object.values(accuracyBySubject).reduce((a, b) => a + b, 0) / Object.values(accuracyBySubject).length)
        : 0,
    };

    // Use AI to analyze user learning pattern
    const userAnalysis = await aiRecommendations.analyzeUserLearningPattern(userStats);

    // Get available decks
    const availableDecks = await publicDeckLibrary
      .find({ visibility: 'published' })
      .sort({ rating: -1, usage_count: -1 })
      .limit(50)
      .toArray();

    // Use AI to suggest relevant decks
    const aiSuggestions = await aiRecommendations.suggestDecksWithAI(
      userAnalysis,
      availableDecks,
      user
    );

    // Convert AI suggestions to database format
    for (const suggestion of aiSuggestions) {
      const deck = availableDecks.find(d => d._id.toString() === suggestion.deck_id.toString());
      if (deck) {
        const existing = await studyRecommendations.findOne({
          user_id: userId,
          type: 'deck',
          target_id: deck._id,
        });

        if (!existing) {
          recommendations.push({
            _id: randomUUID(),
            user_id: userId,
            type: 'deck',
            target_id: deck._id,
            target_name: deck.title,
            reason: suggestion.reason,
            justification: suggestion.justification,
            confidence: suggestion.confidence,
            dismissed: false,
            clicked: false,
            created_at: now,
          });
        }
      }
    }

    // If AI recommendations are sparse, add fallback trending decks
    if (recommendations.length < 3) {
      const trendingDecks = await publicDeckLibrary
        .find({ visibility: 'published' })
        .sort({ imports: -1 })
        .limit(3)
        .toArray();

      for (const deck of trendingDecks) {
        const existing = await studyRecommendations.findOne({
          user_id: userId,
          type: 'deck',
          target_id: deck._id,
        });

        if (!existing && !recommendations.some(r => r.target_id.toString() === deck._id.toString())) {
          recommendations.push({
            _id: randomUUID(),
            user_id: userId,
            type: 'deck',
            target_id: deck._id,
            target_name: deck.title,
            reason: 'trending',
            confidence: 0.65,
            dismissed: false,
            clicked: false,
            created_at: now,
          });
        }
      }
    }
  } catch (aiError) {
    console.warn('[Recommendations] AI analysis failed, using fallback heuristic:', aiError.message);
    // Fall back to heuristic recommendations if AI fails
    return generateHeuristicRecommendations(userId);
  }

  // Insert recommendations
  if (recommendations.length > 0) {
    try {
      await studyRecommendations.insertMany(recommendations);
    } catch (insertError) {
      if (insertError.code !== 11000) throw insertError;
    }
  }

  return recommendations;
}

// Fallback heuristic recommendations
async function generateHeuristicRecommendations(userId) {
  const {
    flashcards,
    publicDeckLibrary,
    studyRecommendations,
  } = getDatabase();

  const recommendations = [];
  const now = new Date().toISOString();

  const userCards = await flashcards.find({ user_id: userId }).toArray();
  if (userCards.length > 0) {
    const subjectStats = {};
    userCards.forEach(card => {
      const subject = card.subject || 'Geral';
      if (!subjectStats[subject]) {
        subjectStats[subject] = { correct: 0, total: 0 };
      }
      subjectStats[subject].total += 1;
      if (card.ease_factor > 2.5) subjectStats[subject].correct += 1;
    });

    const weakSubjects = Object.entries(subjectStats)
      .map(([subject, stats]) => ({
        subject,
        accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
      }))
      .filter(s => s.accuracy < 0.75)
      .sort((a, b) => a.accuracy - b.accuracy);

    for (const weak of weakSubjects.slice(0, 2)) {
      const decks = await publicDeckLibrary
        .find({
          subject: weak.subject,
          visibility: 'published',
        })
        .limit(2)
        .toArray();

      for (const deck of decks) {
        const existing = await studyRecommendations.findOne({
          user_id: userId,
          type: 'deck',
          target_id: deck._id,
        });

        if (!existing) {
          recommendations.push({
            _id: randomUUID(),
            user_id: userId,
            type: 'deck',
            target_id: deck._id,
            target_name: deck.title,
            reason: 'weak_area',
            confidence: Math.min(0.95, 0.7 + (0.75 - weak.accuracy)),
            dismissed: false,
            clicked: false,
            created_at: now,
          });
        }
      }
    }
  }

  const trendingDecks = await publicDeckLibrary
    .find({ visibility: 'published' })
    .sort({ imports: -1 })
    .limit(3)
    .toArray();

  for (const deck of trendingDecks) {
    const existing = await studyRecommendations.findOne({
      user_id: userId,
      type: 'deck',
      target_id: deck._id,
    });

    if (!existing && !recommendations.some(r => r.target_id.toString() === deck._id.toString())) {
      recommendations.push({
        _id: randomUUID(),
        user_id: userId,
        type: 'deck',
        target_id: deck._id,
        target_name: deck.title,
        reason: 'trending',
        confidence: 0.6,
        dismissed: false,
        clicked: false,
        created_at: now,
      });
    }
  }

  if (recommendations.length > 0) {
    try {
      await studyRecommendations.insertMany(recommendations);
    } catch (insertError) {
      if (insertError.code !== 11000) throw insertError;
    }
  }

  return recommendations;
}

module.exports = router;
