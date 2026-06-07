const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const gemini = require('./geminiService');

const STOP_WORDS = new Set([
  'de', 'da', 'do', 'dos', 'das', 'a', 'o', 'e', 'em', 'para', 'por', 'com', 'no', 'na', 'nos', 'nas',
  'um', 'uma', 'que', 'se', 'ao', 'aos', 'as', 'como', 'mais', 'menos', 'ou', 'ser', 'estar', 'sobre',
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 25);
}

function summarizeSnippet(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= 240) return normalized;
  return `${normalized.slice(0, 237).trim()}...`;
}

function extractConcepts(theme, subject) {
  const merged = `${theme || ''} ${subject || ''}`;
  const uniq = [];
  const seen = new Set();

  for (const token of tokenize(merged)) {
    if (seen.has(token)) continue;
    seen.add(token);
    uniq.push(token);
  }

  if (uniq.length === 0) {
    return ['conceito', 'aplicacao', 'revisao'];
  }

  return uniq.slice(0, 10);
}

function buildQuestion(index, themeLabel, concept, snippet) {
  if (snippet) {
    const templates = [
      `No trecho "${snippet}", qual e o conceito central para ${themeLabel}?`,
      `A partir do trecho "${snippet}", o que voce precisa lembrar para ${themeLabel}?`,
      `Qual ponto de prova pode ser cobrado com base em: "${snippet}"?`,
      `Explique o trecho "${snippet}" em uma frase objetiva para revisar ${themeLabel}.`,
    ];
    return templates[index % templates.length];
  }

  const templates = [
    `No tema "${themeLabel}", como voce explicaria o conceito de ${concept}?`,
    `Qual e a definicao curta de ${concept} em ${themeLabel}?`,
    `Quando ${concept} aparece em ${themeLabel}, qual e o ponto mais importante?`,
    `Quais sinais indicam que ${concept} e central em ${themeLabel}?`,
    `Qual erro comum deve ser evitado ao estudar ${concept} em ${themeLabel}?`,
  ];
  return templates[index % templates.length];
}

function buildAnswer(index, themeLabel, concept, snippet) {
  if (snippet) {
    const templates = [
      `Resumo do trecho: ${snippet}. Relacione isso com ${themeLabel} e memorize o criterio principal.`,
      `Esse trecho destaca um ponto-chave de ${themeLabel}. Revise definicao, contexto e aplicacao pratica.`,
      `Transforme o trecho em checklist: conceito, quando aparece e como resolver em ${themeLabel}.`,
      `Regra de revisao: releia o trecho, explique com suas palavras e conecte com exemplos de ${themeLabel}.`,
    ];
    return templates[index % templates.length];
  }

  const templates = [
    `${concept} e um ponto-chave de ${themeLabel}. Revise definicao, criterio de aplicacao e exemplo pratico.`,
    `Resumo rapido: em ${themeLabel}, ${concept} conecta teoria e decisao pratica. Foque em quando usar e por que usar.`,
    `Para memorizar ${concept}: (1) conceito base, (2) contexto de uso em ${themeLabel}, (3) diferenca para temas parecidos.`,
    `Checklist de prova para ${concept}: definicao correta, criterio principal e implicacao clinica/pratica em ${themeLabel}.`,
    `${concept} em ${themeLabel}: pense em gatilho, conduta e revisao posterior para consolidar memoria de longo prazo.`,
  ];
  return templates[index % templates.length];
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
  const concepts = extractConcepts(effectiveTheme, safeSubject);
  const snippets = splitSentences(normalizedSource).slice(0, 20);

  const { flashcards } = getDatabase();
  const now = new Date().toISOString();
  let targetDeckId = deckId || null;

  if (!targetDeckId) {
    const aiDeck = await ensureAIDeck(userId, safeSubject === 'Estudo' ? '' : safeSubject);
    targetDeckId = aiDeck._id;
  }

  let cardPairs = null;

  if (gemini.isAvailable()) {
    try {
      cardPairs = await gemini.generateFlashcardsWithAI({
        theme: effectiveTheme,
        subject: safeSubject,
        quantity: safeQty,
        sourceText: normalizedSource || null,
      });
    } catch (err) {
      console.warn('[Flashcard] Gemini falhou, usando templates:', err.message);
    }
  }

  const cards = [];
  for (let i = 0; i < safeQty; i += 1) {
    const concept = concepts[i % concepts.length];
    const snippet = snippets.length > 0 ? summarizeSnippet(snippets[i % snippets.length]) : null;

    const question = cardPairs?.[i]?.question || buildQuestion(i, effectiveTheme, concept, snippet);
    const answer = cardPairs?.[i]?.answer || buildAnswer(i, effectiveTheme, concept, snippet);

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
