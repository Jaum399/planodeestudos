const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const aiProvider = require('./aiProvider');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeTheme(theme) {
  const value = String(theme || '').trim().replace(/\s+/g, ' ');
  return value;
}

async function ensureAIDeck(userId, subject) {
  const { flashcardDecks } = getDatabase();
  const now = new Date().toISOString();
  const baseName = 'Flashcards IA';
  const deckName = subject ? `${baseName} - ${subject}` : baseName;

  let deck = await flashcardDecks.findOne({ user_id: userId, name: deckName });
  if (!deck) {
    deck = await flashcardDecks.create({
      _id: randomUUID(),
      user_id: userId,
      name: deckName,
      color: '#7c3aed',
      description: 'Deck criado automaticamente pela IA a partir de temas pedidos pelo usuario.',
      created_at: now,
      updated_at: now,
    });
  }

  return deck;
}

async function createFlashcardsForTheme({ userId, theme, subject, quantity, deckId, sourceText }) {
  const normalizedTheme = normalizeTheme(theme);
  const normalizedSource = String(sourceText || '').trim();

  if (!normalizedTheme && !normalizedSource) {
    throw new Error('theme_required');
  }

  const safeQty = clamp(Number(quantity || 8), 3, 20);
  const safeSubject = String(subject || '').trim() || 'Estudo';
  const effectiveTheme = normalizedTheme || safeSubject || 'Conteudo personalizado';
  if (!aiProvider.isAvailable()) {
    throw new Error('AI_NOT_CONFIGURED');
  }

  let cardPairs;
  try {
    cardPairs = await aiProvider.generateFlashcardsWithAI({
      theme: effectiveTheme,
      subject: safeSubject,
      quantity: safeQty,
      sourceText: normalizedSource || null,
    });
  } catch (err) {
    console.error('[Flashcard] AI generation failed:', err.message);
    throw new Error('AI_GENERATION_FAILED');
  }

  if (!Array.isArray(cardPairs) || cardPairs.length !== safeQty) {
    throw new Error('AI_INVALID_FLASHCARDS');
  }

  const cardsAreValid = cardPairs.every((card) => (
    card && typeof card.question === 'string' && card.question.trim().length >= 8
    && typeof card.answer === 'string' && card.answer.trim().length >= 8
  ));
  if (!cardsAreValid) throw new Error('AI_INVALID_FLASHCARDS');

  const { flashcards } = getDatabase();
  const now = new Date().toISOString();
  let targetDeckId = deckId || null;

  if (!targetDeckId) {
    const aiDeck = await ensureAIDeck(userId, safeSubject === 'Estudo' ? '' : safeSubject);
    targetDeckId = aiDeck._id;
  }

  const cards = [];
  for (let i = 0; i < safeQty; i += 1) {
    const question = cardPairs[i].question.trim();
    const answer = cardPairs[i].answer.trim();

    cards.push({
      _id: randomUUID(),
      user_id: userId,
      deck_id: targetDeckId,
      subject: safeSubject,
      question,
      answer,
      difficulty: 0,
      next_review: now,
      review_count: 0,
      ease_factor: 2.5,
      interval_days: 1,
      created_at: now,
      updated_at: now,
    });
  }

  await flashcards.insertMany(cards);

  return {
    created: cards.length,
    deck_id: targetDeckId,
    subject: safeSubject,
    theme: effectiveTheme,
  };
}

module.exports = {
  createFlashcardsForTheme,
};
