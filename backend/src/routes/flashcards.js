const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

function toCard(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { __v, ...rest } = obj;
  return { ...rest, id: rest._id };
}

function toProgress(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { __v, ...rest } = obj;
  return { ...rest, id: rest._id };
}

// SM-2 spaced repetition algorithm
function calculateNextReview(difficulty, easeFactor, intervalDays) {
  let newInterval;
  let newEaseFactor = easeFactor;

  if (difficulty === 0) {
    newInterval = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (difficulty === 1) {
    newInterval = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (difficulty === 2) {
    newInterval = Math.max(1, Math.round(intervalDays * easeFactor * 0.9));
    newEaseFactor = easeFactor;
  } else {
    newInterval = Math.round(intervalDays * easeFactor);
    newEaseFactor = Math.min(4.0, easeFactor + 0.1);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    newInterval,
    newEaseFactor,
    nextReview: nextDate.toISOString().split('T')[0]
  };
}

// GET /api/flashcards
router.get('/', async (req, res) => {
  try {
    const { flashcards, users } = getDatabase();
    const query = { user_id: req.user.id };

    if (req.query.deck_id) {
      query.deck_id = req.query.deck_id === 'none' ? null : req.query.deck_id;
    }

    // Auto-filter by user's area if no subject specified
    if (!req.query.subject && !req.query.all) {
      const user = await users.findOne({ _id: req.user.id });
      if (user?.area) {
        query.subject = new RegExp(user.area, 'i');
      }
    } else if (req.query.subject) {
      query.subject = new RegExp(req.query.subject, 'i');
    }

    const cards = await flashcards.find(query).sort({ created_at: -1 });
    res.json({ cards: cards.map(toCard) });
  } catch (error) {
    console.error('Flashcards list error:', error);
    res.status(500).json({ error: 'Erro ao carregar flashcards' });
  }
});

// GET /api/flashcards/review - cards due for review
router.get('/review', async (req, res) => {
  try {
    const { flashcards, users } = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const query = { user_id: req.user.id };

    if (req.query.deck_id) {
      query.deck_id = req.query.deck_id === 'none' ? null : req.query.deck_id;
    }

    // Auto-filter by user's area if no subject specified
    if (!req.query.subject && !req.query.all) {
      const user = await users.findOne({ _id: req.user.id });
      if (user?.area) {
        query.subject = new RegExp(user.area, 'i');
      }
    } else if (req.query.subject) {
      query.subject = new RegExp(req.query.subject, 'i');
    }

    const all = await flashcards.find(query);
    const cards = all
      .filter(c => !c.next_review || c.next_review <= today)
      .sort((a, b) => (a.next_review || '') < (b.next_review || '') ? -1 : 1)
      .slice(0, 20);
    res.json({ cards: cards.map(toCard) });
  } catch (error) {
    console.error('Flashcards review error:', error);
    res.status(500).json({ error: 'Erro ao carregar flashcards para revisão' });
  }
});

// GET /api/flashcards/progress
// Retorna progresso por deck + listas úteis para UX (recentes e para revisar hoje)
// Query params: ?recentPage=1&recentLimit=6&dueToday_page=1&dueTodayLimit=6
router.get('/progress', async (req, res) => {
  try {
    const { flashcards, flashcardDecks, flashcardProgress } = getDatabase();
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Pagination params
    const recentLimit = Math.min(Number(req.query.recentLimit) || 6, 50);
    const recentPage = Math.max(Number(req.query.recentPage) || 1, 1);
    const dueTodayLimit = Math.min(Number(req.query.dueTodayLimit) || 6, 50);
    const dueTodayPage = Math.max(Number(req.query.dueTodayPage) || 1, 1);

    const [decks, progressDocs, allCards] = await Promise.all([
      flashcardDecks.find({ user_id: userId }).sort({ created_at: -1 }),
      flashcardProgress.find({ user_id: userId }).sort({ updated_at: -1 }),
      flashcards.find({ user_id: userId }),
    ]);

    const deckById = new Map();
    for (const deck of decks) {
      deckById.set(deck._id, deck);
    }

    const statsByDeck = {};
    for (const card of allCards) {
      const key = card.deck_id || 'none';
      if (!statsByDeck[key]) {
        statsByDeck[key] = { total_cards: 0, due_today: 0 };
      }
      statsByDeck[key].total_cards += 1;
      if (!card.next_review || card.next_review <= today) {
        statsByDeck[key].due_today += 1;
      }
    }

    const progress = progressDocs.map((doc) => {
      const p = toProgress(doc);
      const deck = p.deck_id === 'none' ? null : deckById.get(p.deck_id);
      const deckStats = statsByDeck[p.deck_id] || { total_cards: 0, due_today: 0 };
      const accuracy = p.reviewed_count > 0
        ? Math.round((p.correct_count / p.reviewed_count) * 100)
        : 0;

      return {
        ...p,
        deck_name: p.deck_id === 'none' ? 'Sem categoria' : (deck?.name || 'Deck removido'),
        deck_color: p.deck_id === 'none' ? '#7c3aed' : (deck?.color || '#7c3aed'),
        total_cards: deckStats.total_cards,
        due_today: deckStats.due_today,
        accuracy,
      };
    });

    // Recent decks with pagination
    const allRecentDecks = [...progress]
      .sort((a, b) => String(b.last_reviewed_at || '').localeCompare(String(a.last_reviewed_at || '')));
    const recentStart = (recentPage - 1) * recentLimit;
    const recentDecks = allRecentDecks.slice(recentStart, recentStart + recentLimit);
    const recentTotal = allRecentDecks.length;

    // Due today decks with pagination
    const allDueTodayDecks = [...progress]
      .filter((p) => Number(p.due_today || 0) > 0)
      .sort((a, b) => Number(b.due_today || 0) - Number(a.due_today || 0));
    const dueTodayStart = (dueTodayPage - 1) * dueTodayLimit;
    const dueTodayDecks = allDueTodayDecks.slice(dueTodayStart, dueTodayStart + dueTodayLimit);
    const dueTodayTotal = allDueTodayDecks.length;

    const summary = {
      tracked_decks: progress.length,
      reviewed_total: progress.reduce((acc, p) => acc + Number(p.reviewed_count || 0), 0),
      correct_total: progress.reduce((acc, p) => acc + Number(p.correct_count || 0), 0),
      wrong_total: progress.reduce((acc, p) => acc + Number(p.wrong_count || 0), 0),
      due_today_total: progress.reduce((acc, p) => acc + Number(p.due_today || 0), 0),
    };

    res.json({
      progress,
      recentDecks,
      recentPagination: {
        page: recentPage,
        limit: recentLimit,
        total: recentTotal,
        hasMore: recentStart + recentLimit < recentTotal,
      },
      dueTodayDecks,
      dueTodayPagination: {
        page: dueTodayPage,
        limit: dueTodayLimit,
        total: dueTodayTotal,
        hasMore: dueTodayStart + dueTodayLimit < dueTodayTotal,
      },
      summary,
      today,
    });
  } catch (err) {
    console.error('Get flashcards progress error:', err);
    res.status(500).json({ error: 'Erro ao carregar progresso dos flashcards' });
  }
});

// POST /api/flashcards
router.post('/', async (req, res) => {
  try {
    const { subject, question, answer } = req.body;

    if (!subject || !question || !answer) {
      return res.status(400).json({ error: 'Matéria, pergunta e resposta são obrigatórias' });
    }

    const { flashcards, flashcardProgress } = getDatabase();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const card = new flashcards({
      _id: randomUUID(),
      user_id: req.user.id,
      deck_id: req.body.deck_id || null,
      subject: subject.trim(),
      question: question.trim(),
      answer: answer.trim(),
      difficulty: 0,
      next_review: today,
      review_count: 0,
      ease_factor: 2.5,
      interval_days: 1,
      created_at: now,
      updated_at: now,
    });
    await card.save();

    res.status(201).json({ card: toCard(card) });
  } catch (err) {
    console.error('Create flashcard error:', err);
    res.status(500).json({ error: 'Erro ao criar flashcard' });
  }
});

// POST /api/flashcards/batch - Bulk create flashcards
router.post('/batch', async (req, res) => {
  try {
    const { cards } = req.body;

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Deve conter array de flashcards' });
    }

    if (cards.length > 100) {
      return res.status(400).json({ error: 'Máximo 100 flashcards por vez' });
    }

    const { flashcards } = getDatabase();
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const created = [];
    const errors: string[] = [];

    for (let i = 0; i < cards.length; i++) {
      try {
        const { subject, question, answer, deck_id } = cards[i];

        if (!subject || !question || !answer) {
          errors.push(`Card ${i + 1}: Matéria, pergunta e resposta são obrigatórias`);
          continue;
        }

        const card = new flashcards({
          _id: randomUUID(),
          user_id: req.user.id,
          deck_id: deck_id || null,
          subject: subject.trim(),
          question: question.trim(),
          answer: answer.trim(),
          difficulty: 0,
          next_review: today,
          review_count: 0,
          ease_factor: 2.5,
          interval_days: 1,
          created_at: now,
          updated_at: now,
        });
        await card.save();
        created.push(toCard(card));
      } catch (error) {
        errors.push(`Card ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    res.status(201).json({
      created: created.length,
      cards: created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Batch create flashcards error:', err);
    res.status(500).json({ error: 'Erro ao criar flashcards em lote' });
  }
});

// PUT /api/flashcards/:id/review

// Integra progresso do usuário ao revisar um flashcard
router.put('/:id/review', async (req, res) => {
  try {
    const { difficulty } = req.body;
    if (difficulty === undefined || difficulty < 0 || difficulty > 3) {
      return res.status(400).json({ error: 'Dificuldade deve ser entre 0 e 3' });
    }

    const { flashcards } = getDatabase();
    const card = await flashcards.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Flashcard não encontrado' });
    }

    const { newInterval, newEaseFactor, nextReview } = calculateNextReview(
      difficulty, card.ease_factor, card.interval_days
    );

    const updated = await flashcards.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: {
        difficulty,
        ease_factor: newEaseFactor,
        interval_days: newInterval,
        next_review: nextReview,
        review_count: card.review_count + 1,
        updated_at: new Date().toISOString(),
      }},
      { new: true }
    );

    // Atualiza progresso do usuário no deck
    try {
      const now = new Date().toISOString();
      const deckId = card.deck_id || 'none';
      const progressId = `${req.user.id}_${deckId}`;
      const isCorrect = difficulty >= 2;
      await flashcardProgress.findOneAndUpdate(
        { _id: progressId },
        {
          $setOnInsert: {
            user_id: req.user.id,
            deck_id: deckId,
            created_at: now,
          },
          $set: {
            last_reviewed_at: now,
            last_card_id: card._id,
            last_card_at: now,
            updated_at: now,
          },
          $inc: {
            reviewed_count: 1,
            correct_count: isCorrect ? 1 : 0,
            wrong_count: isCorrect ? 0 : 1,
          },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Erro ao atualizar progresso do deck:', err);
    }

    res.json({ card: toCard(updated) });
  } catch (err) {
    console.error('Review flashcard error:', err);
    res.status(500).json({ error: 'Erro ao revisar flashcard' });
  }
});

// PUT /api/flashcards/:id
router.put('/:id', async (req, res) => {
  try {
    const { subject, question, answer } = req.body;
    const { flashcards } = getDatabase();
    const card = await flashcards.findOne({ _id: req.params.id, user_id: req.user.id });

    if (!card) {
      return res.status(404).json({ error: 'Flashcard não encontrado' });
    }

    const updated = await flashcards.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: {
        subject: subject || card.subject,
        question: question || card.question,
        answer: answer || card.answer,
        deck_id: req.body.deck_id !== undefined ? req.body.deck_id : card.deck_id,
        updated_at: new Date().toISOString(),
      }},
      { new: true }
    );

    res.json({ card: toCard(updated) });
  } catch (err) {
    console.error('Update flashcard error:', err);
    res.status(500).json({ error: 'Erro ao atualizar flashcard' });
  }
});

// DELETE /api/flashcards/:id
router.delete('/:id', async (req, res) => {
  const { flashcards } = getDatabase();
  const card = await flashcards.findOne({ _id: req.params.id, user_id: req.user.id });

  if (!card) {
    return res.status(404).json({ error: 'Flashcard não encontrado' });
  }

  await flashcards.deleteOne({ _id: req.params.id, user_id: req.user.id });
  res.json({ message: 'Flashcard removido com sucesso' });
});

module.exports = router;
