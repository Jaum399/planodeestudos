const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');
const LessonProgress = require('../models/LessonProgress');

const router = express.Router();
router.use(authenticate, requireAccess);

// GET /api/analytics
router.get('/', async (req, res) => {
  const { sessions, flashcards, planner } = getDatabase();
  const userId = req.user.id;

  // Last 7 days grouped by date
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const allSessions = await sessions.find({ user_id: userId }).lean();
  const recentSessions = allSessions.filter(s => s.session_date >= sevenDaysAgoStr);

  const byDate = recentSessions.reduce((acc, s) => {
    acc[s.session_date] = (acc[s.session_date] || 0) + (s.duration_minutes || 0);
    return acc;
  }, {});
  const last7Days = Object.entries(byDate)
    .map(([session_date, total_minutes]) => ({ session_date, total_minutes }))
    .sort((a, b) => a.session_date.localeCompare(b.session_date));

  const weeklyMinutes = recentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  // Subject accuracy (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const recentWithQuestions = allSessions.filter(
    s => s.session_date >= thirtyDaysAgoStr && s.total_questions > 0
  );
  const subjectMap = recentWithQuestions.reduce((acc, s) => {
    if (!acc[s.subject]) acc[s.subject] = { correct: 0, total: 0 };
    acc[s.subject].correct += s.correct_answers || 0;
    acc[s.subject].total += s.total_questions || 0;
    return acc;
  }, {});
  const subjectAccuracy = Object.entries(subjectMap)
    .map(([subject, { correct, total }]) => ({
      subject,
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  // Streak calculation
  const distinctDates = [...new Set(allSessions.map(s => s.session_date))].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < distinctDates.length; i++) {
    const sessionDate = new Date(distinctDates[i] + 'T12:00:00');
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    if (
      sessionDate.getFullYear() === expectedDate.getFullYear() &&
      sessionDate.getMonth() === expectedDate.getMonth() &&
      sessionDate.getDate() === expectedDate.getDate()
    ) {
      streak++;
    } else {
      break;
    }
  }

  // Flashcard stats
  const allFlashcards = await flashcards.find({ user_id: userId }).lean();
  const flashcardStats = {
    total: allFlashcards.length,
    total_reviews: allFlashcards.reduce((sum, c) => sum + (c.review_count || 0), 0),
  };

  // Planner stats
  const allPlanner = await planner.find({ user_id: userId }).lean();
  const plannerStats = {
    total: allPlanner.length,
    done: allPlanner.filter(p => p.status === 'done').length,
    in_progress: allPlanner.filter(p => p.status === 'in-progress').length,
  };

  // Today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = allSessions.filter(s => s.session_date === todayStr);
  const todayQuestions = todaySessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
  const todayCorrect = todaySessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);
  const todayAccuracy = todayQuestions > 0 ? Math.round((todayCorrect / todayQuestions) * 1000) / 10 : 0;
  const todayFlashcards = await flashcards.countDocuments
    ? await flashcards.countDocuments({ user_id: userId, updated_at: { $gte: todayStr } })
    : allFlashcards.filter(f => (f.updated_at || '').startsWith(todayStr)).length;
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
  const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);
  const todayLessons = await LessonProgress.countDocuments({
    user_id: userId,
    completed: true,
    updatedAt: { $gte: todayStart, $lte: todayEnd },
  });

  // Activity heatmap — last 84 days (12 weeks)
  const eightyFourDaysAgo = new Date();
  eightyFourDaysAgo.setDate(eightyFourDaysAgo.getDate() - 83);
  const eightyFourDaysAgoStr = eightyFourDaysAgo.toISOString().split('T')[0];
  const heatmapSessions = allSessions.filter(s => s.session_date >= eightyFourDaysAgoStr);
  const heatmapMap = heatmapSessions.reduce((acc, s) => {
    acc[s.session_date] = (acc[s.session_date] || 0) + (s.duration_minutes || 0);
    return acc;
  }, {});
  const activityHeatmap = Object.entries(heatmapMap).map(([date, minutes]) => ({ date, minutes }));

  res.json({
    last7Days,
    weeklyMinutes,
    subjectAccuracy,
    streak,
    flashcardStats,
    plannerStats,
    todayStats: {
      questions: todayQuestions,
      correct: todayCorrect,
      accuracy: todayAccuracy,
      flashcardsReviewed: todayFlashcards,
      lessons: todayLessons,
    },
    activityHeatmap,
  });
});

// POST /api/analytics/session
router.post('/session', async (req, res) => {
  try {
    const { subject, duration_minutes, correct_answers, total_questions } = req.body;

    if (!subject || !duration_minutes) {
      return res.status(400).json({ error: 'Matéria e duração são obrigatórios' });
    }

    const { sessions } = getDatabase();
    const now = new Date().toISOString();
    const session = new sessions({
      _id: randomUUID(),
      user_id: req.user.id,
      subject: subject.trim(),
      duration_minutes,
      correct_answers: correct_answers || 0,
      total_questions: total_questions || 0,
      session_date: now.split('T')[0],
      created_at: now,
    });
    await session.save();

    res.status(201).json({ message: 'Sessão registrada com sucesso' });
  } catch (err) {
    console.error('Create study session error:', err);
    res.status(500).json({ error: 'Erro ao registrar sessão' });
  }
});

// GET /api/analytics/sessions
router.get('/sessions', async (req, res) => {
  const { sessions } = getDatabase();
  const result = await sessions.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(50).lean();
  res.json({ sessions: result });
});

module.exports = router;
