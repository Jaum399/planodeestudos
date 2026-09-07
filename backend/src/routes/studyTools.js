const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');
const { createFlashcardsForTheme } = require('../services/flashcardGeneration');
const aiProvider = require('../services/aiProvider');

const router = express.Router();
router.use(authenticate, requireAccess);

const STOP_WORDS = new Set([
  'de', 'da', 'do', 'dos', 'das', 'a', 'o', 'e', 'em', 'para', 'por', 'com', 'no', 'na', 'nos', 'nas',
  'um', 'uma', 'que', 'se', 'ao', 'à', 'às', 'os', 'as', 'como', 'mais', 'menos', 'ou', 'é', 'são',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function generateSummary(text) {
  const source = String(text || '').trim();
  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const bullets = sentences.slice(0, 6).map((s) => s.replace(/\s+/g, ' '));
  const tokens = tokenize(source);
  const freq = new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);

  const keyTerms = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term]) => term);

  const mindmapNodes = keyTerms.slice(0, 6).map((term) => term.charAt(0).toUpperCase() + term.slice(1));

  return { bullets, keyTerms, mindmapNodes };
}

function topSubjectsByWeakness(attempts) {
  const bySubject = new Map();
  for (const attempt of attempts) {
    const key = attempt.subject || 'Geral';
    const value = bySubject.get(key) || { total: 0, correct: 0 };
    value.total += 1;
    if (attempt.is_correct) value.correct += 1;
    bySubject.set(key, value);
  }

  return [...bySubject.entries()]
    .map(([subject, stats]) => ({
      subject,
      total: stats.total,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);
}

// GET /api/study-tools/ai-status
router.get('/ai-status', async (req, res) => {
  try {
    const status = aiProvider.getStatus();
    return res.json(status);
  } catch (error) {
    console.error('AI status error:', error);
    return res.status(500).json({ error: 'Erro ao verificar status da IA' });
  }
});

// GET /api/study-tools/mnemonics
router.get('/mnemonics', async (req, res) => {
  try {
    const { mnemonics } = getDatabase();
    const items = await mnemonics.find({ user_id: req.user.id }).sort({ created_at: -1 });
    return res.json({ items: items.map((doc) => ({ ...(doc.toObject ? doc.toObject() : doc), id: doc._id })) });
  } catch (error) {
    console.error('Mnemonics list error:', error);
    return res.status(500).json({ error: 'Erro ao listar mnemônicos' });
  }
});

// POST /api/study-tools/mnemonics
router.post('/mnemonics', async (req, res) => {
  try {
    const { term, phrase, context } = req.body;
    if (!term || !phrase) return res.status(400).json({ error: 'term e phrase são obrigatórios' });

    const { mnemonics } = getDatabase();
    const item = new mnemonics({
      _id: randomUUID(),
      user_id: req.user.id,
      term: String(term).trim(),
      phrase: String(phrase).trim(),
      context: String(context || '').trim(),
      created_at: new Date().toISOString(),
    });
    await item.save();

    const obj = item.toObject ? item.toObject() : { ...item };
    return res.status(201).json({ item: { ...obj, id: obj._id } });
  } catch (error) {
    console.error('Mnemonic create error:', error);
    return res.status(500).json({ error: 'Erro ao criar mnemônico' });
  }
});

// GET /api/study-tools/summaries
router.get('/summaries', async (req, res) => {
  try {
    const { studySummaries, users } = getDatabase();
    const query = { user_id: req.user.id };

    // Auto-filter by user's area if no subject specified
    if (!req.query.subject && !req.query.all) {
      const user = await users.findOne({ _id: req.user.id });
      if (user?.area) {
        query.subject = new RegExp(user.area, 'i');
      }
    } else if (req.query.subject) {
      query.subject = new RegExp(req.query.subject, 'i');
    }

    const items = await studySummaries.find(query).sort({ created_at: -1 }).limit(50);
    return res.json({ items: items.map((doc) => ({ ...(doc.toObject ? doc.toObject() : doc), id: doc._id })) });
  } catch (error) {
    console.error('Summaries list error:', error);
    return res.status(500).json({ error: 'Erro ao listar resumos' });
  }
});

// POST /api/study-tools/summarize
router.post('/summarize', async (req, res) => {
  try {
    const { title, text, subject } = req.body;
    if (!title || !text) return res.status(400).json({ error: 'title e text são obrigatórios' });

    let generated;
    if (aiProvider.isAvailable()) {
      try {
        generated = await aiProvider.generateSummaryWithAI({ text, title, subject });
      } catch (err) {
        console.warn('[Summarize] AI generation falhou, usando extração local:', err.message);
      }
    }
    if (!generated || generated.bullets.length === 0) {
      generated = generateSummary(text);
    }

    const { studySummaries } = getDatabase();
    const item = new studySummaries({
      _id: randomUUID(),
      user_id: req.user.id,
      title: String(title).trim(),
      subject: String(subject || '').trim(),
      source_text: String(text).trim(),
      bullets: generated.bullets,
      key_terms: generated.keyTerms,
      mindmap_nodes: generated.mindmapNodes,
      created_at: new Date().toISOString(),
    });
    await item.save();

    const obj = item.toObject ? item.toObject() : { ...item };
    return res.status(201).json({ item: { ...obj, id: obj._id } });
  } catch (error) {
    console.error('Summarize error:', error);
    return res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
});

// POST /api/study-tools/summaries/:id/to-flashcards
router.post('/summaries/:id/to-flashcards', async (req, res) => {
  try {
    const { studySummaries, flashcards } = getDatabase();
    const summary = await studySummaries.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!summary) return res.status(404).json({ error: 'Resumo não encontrado' });

    const bullets = (summary.bullets || []).slice(0, 8);
    if (bullets.length === 0) return res.status(400).json({ error: 'Resumo sem pontos para converter' });

    const now = new Date().toISOString();
    const cards = bullets.map((bullet, idx) => new flashcards({
      _id: randomUUID(),
      user_id: req.user.id,
      subject: summary.subject || 'Medicina',
      question: `Ponto-chave ${idx + 1}: qual o conceito principal?`,
      answer: bullet,
      difficulty: 0,
      next_review: now,
      review_count: 0,
      ease_factor: 2.5,
      interval_days: 1,
      created_at: now,
      updated_at: now,
    }));

    await flashcards.insertMany(cards);
    return res.json({ created: cards.length });
  } catch (error) {
    console.error('Summary to flashcards error:', error);
    return res.status(500).json({ error: 'Erro ao converter resumo em flashcards' });
  }
});

// POST /api/study-tools/flashcards/generate
router.post('/flashcards/generate', async (req, res) => {
  try {
    const { theme, subject, quantity, deck_id, source_text } = req.body || {};
    const safeTheme = String(theme || '').trim();
    const safeSourceText = String(source_text || '').trim();

    if (safeTheme.length < 3 && safeSourceText.length < 40) {
      return res.status(400).json({
        error: 'informe um tema (minimo 3 caracteres) ou cole um conteudo proprio com pelo menos 40 caracteres',
      });
    }

    const result = await createFlashcardsForTheme({
      userId: req.user.id,
      theme: safeTheme || undefined,
      subject: String(subject || '').trim() || undefined,
      quantity: Number(quantity || 8),
      deckId: deck_id ? String(deck_id) : undefined,
      sourceText: safeSourceText || undefined,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Generate flashcards by theme error:', error);
    if (error?.message === 'theme_required') {
      return res.status(400).json({ error: 'theme e obrigatorio' });
    }
    return res.status(500).json({ error: 'Erro ao gerar flashcards automaticamente' });
  }
});

// GET /api/study-tools/daily-plan
router.get('/daily-plan', async (req, res) => {
  try {
    const { questionAttempts, flashcards, deadlineReminders, schedule, users } = getDatabase();

    // Get user's area for filtering
    const user = await users.findOne({ _id: req.user.id });
    const userArea = user?.area || null;

    let attemptsQuery = { user_id: req.user.id };
    let flashcardsQuery = { user_id: req.user.id };
    let scheduleQuery = { user_id: req.user.id };

    // Filter by user's area if they have one
    if (userArea) {
      attemptsQuery.subject = new RegExp(userArea, 'i');
      flashcardsQuery.subject = new RegExp(userArea, 'i');
      scheduleQuery.subject = new RegExp(userArea, 'i');
    }

    const attempts = await questionAttempts.find(attemptsQuery).sort({ created_at: -1 }).limit(120);
    const weakSubjects = topSubjectsByWeakness(attempts);

    const now = new Date().toISOString();
    const dueFlashcards = await flashcards.countDocuments({ ...flashcardsQuery, next_review: { $lte: now } });
    const upcomingReminders = await deadlineReminders.find({ user_id: req.user.id, active: true }).sort({ due_at: 1 }).limit(5);
    const weeklySlots = await schedule.countDocuments(scheduleQuery);

    const blocks = [];

    if (dueFlashcards > 0) {
      blocks.push({
        type: 'flashcards',
        title: 'Revisão espaçada prioritária',
        detail: `${dueFlashcards} flashcards para revisar hoje`,
        minutes: 35,
        priority: 'alta',
      });
    }

    for (const weak of weakSubjects) {
      blocks.push({
        type: 'questions',
        title: `Reforço em ${weak.subject}`,
        detail: `Acurácia recente ${weak.accuracy}% em ${weak.total} tentativas`,
        minutes: 45,
        priority: weak.accuracy < 60 ? 'alta' : 'media',
      });
    }

    if (upcomingReminders.length > 0) {
      const first = upcomingReminders[0];
      blocks.push({
        type: 'deadline',
        title: `Preparação para ${first.kind}: ${first.title}`,
        detail: `Prazo em ${new Date(first.due_at).toLocaleString('pt-BR')}`,
        minutes: 40,
        priority: 'alta',
      });
    }

    if (weeklySlots === 0) {
      blocks.push({
        type: 'schedule',
        title: 'Organizar cronograma semanal',
        detail: 'Você ainda não tem blocos definidos no cronograma',
        minutes: 20,
        priority: 'media',
      });
    }

    if (blocks.length === 0) {
      blocks.push({
        type: 'maintenance',
        title: 'Manutenção de performance',
        detail: 'Faça 20 questões mistas e 15 flashcards para manter consistência',
        minutes: 45,
        priority: 'media',
      });
    }

    return res.json({
      generated_at: new Date().toISOString(),
      metrics: {
        due_flashcards: dueFlashcards,
        weak_subjects: weakSubjects,
        upcoming_deadlines: upcomingReminders.length,
        schedule_slots: weeklySlots,
      },
      blocks,
    });
  } catch (error) {
    console.error('Daily plan error:', error);
    return res.status(500).json({ error: 'Erro ao gerar plano adaptativo diário' });
  }
});

module.exports = router;
