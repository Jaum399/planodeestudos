const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

function toDeck(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { __v, ...rest } = obj;
  return { ...rest, id: rest._id };
}

// GET /api/flashcard-decks
router.get('/', async (req, res) => {
  const { flashcardDecks, flashcards } = getDatabase();
  const decks = await flashcardDecks.find({ user_id: req.user.id }).sort({ created_at: -1 });

  // Count cards per deck
  const allCards = await flashcards.find({ user_id: req.user.id });
  const countByDeck = {};
  for (const card of allCards) {
    const key = card.deck_id || '__none__';
    countByDeck[key] = (countByDeck[key] || 0) + 1;
  }

  const result = decks.map(d => ({
    ...toDeck(d),
    card_count: countByDeck[d._id] || 0,
  }));

  res.json({ decks: result, uncategorized_count: countByDeck['__none__'] || 0 });
});

// POST /api/flashcard-decks
router.post('/', async (req, res) => {
  const { name, color, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do deck é obrigatório' });
  }
  const { flashcardDecks } = getDatabase();
  const now = new Date().toISOString();
  const deck = new flashcardDecks({
    _id: uuidv4(),
    user_id: req.user.id,
    name: name.trim(),
    color: color || '#7c3aed',
    description: description || '',
    created_at: now,
    updated_at: now,
  });
  await deck.save();
  res.status(201).json({ deck: toDeck(deck) });
});

// PUT /api/flashcard-decks/:id
router.put('/:id', async (req, res) => {
  const { name, color, description } = req.body;
  const { flashcardDecks } = getDatabase();
  const deck = await flashcardDecks.findOne({ _id: req.params.id, user_id: req.user.id });
  if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

  const updated = await flashcardDecks.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user.id },
    { $set: {
      name: name || deck.name,
      color: color || deck.color,
      description: description !== undefined ? description : deck.description,
      updated_at: new Date().toISOString(),
    }},
    { new: true }
  );
  res.json({ deck: toDeck(updated) });
});

// DELETE /api/flashcard-decks/:id
router.delete('/:id', async (req, res) => {
  const { flashcardDecks, flashcards } = getDatabase();
  const deck = await flashcardDecks.findOne({ _id: req.params.id, user_id: req.user.id });
  if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

  // Move cards to uncategorized
  await flashcards.updateMany(
    { deck_id: req.params.id, user_id: req.user.id },
    { $set: { deck_id: null } }
  );

  await flashcardDecks.deleteOne({ _id: req.params.id, user_id: req.user.id });
  res.json({ message: 'Deck removido. Cards movidos para sem categoria.' });
});

module.exports = router;
