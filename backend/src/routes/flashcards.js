const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

function toCard(doc) {
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
  const { flashcards } = getDatabase();
  const query = { user_id: req.user.id };
  if (req.query.deck_id) {
    query.deck_id = req.query.deck_id === 'none' ? null : req.query.deck_id;
  }
  const cards = await flashcards.find(query).sort({ created_at: -1 });
  res.json({ cards: cards.map(toCard) });
});

// GET /api/flashcards/review - cards due for review
router.get('/review', async (req, res) => {
  const { flashcards } = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const query = { user_id: req.user.id };
  if (req.query.deck_id) {
    query.deck_id = req.query.deck_id === 'none' ? null : req.query.deck_id;
  }
  const all = await flashcards.find(query);
  const cards = all
    .filter(c => !c.next_review || c.next_review <= today)
    .sort((a, b) => (a.next_review || '') < (b.next_review || '') ? -1 : 1)
    .slice(0, 20);
  res.json({ cards: cards.map(toCard) });
});

// POST /api/flashcards
router.post('/', async (req, res) => {
  try {
    const { subject, question, answer } = req.body;

    if (!subject || !question || !answer) {
      return res.status(400).json({ error: 'Matéria, pergunta e resposta são obrigatórias' });
    }

    const { flashcards } = getDatabase();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const card = new flashcards({
      _id: uuidv4(),
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

// PUT /api/flashcards/:id/review
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
