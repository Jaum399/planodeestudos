const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

// ── Map Templates ─────────────────────────────────────────────────────────────

const AREA_MAPS = {
  medicina: {
    root: 'Medicina',
    branches: [
      { label: 'Anatomia', leaves: ['Sistema Nervoso', 'Sistema Cardiovascular', 'Sistema Musculoesquelético'] },
      { label: 'Fisiologia', leaves: ['Fisiologia Celular', 'Fisiologia Cardíaca', 'Fisiologia Renal'] },
      { label: 'Patologia', leaves: ['Patologia Geral', 'Patologia Sistêmica', 'Oncologia'] },
      { label: 'Farmacologia', leaves: ['Farmacocinética', 'Antibióticos', 'Analgésicos'] },
    ],
  },
  direito: {
    root: 'Direito',
    branches: [
      { label: 'Constitucional', leaves: ['Direitos Fundamentais', 'Organização do Estado', 'Controle de Constitucionalidade'] },
      { label: 'Civil', leaves: ['Contratos', 'Família', 'Responsabilidade Civil'] },
      { label: 'Penal', leaves: ['Crimes contra a Pessoa', 'Crimes Patrimoniais', 'Processo Penal'] },
      { label: 'Administrativo', leaves: ['Atos Administrativos', 'Licitações', 'Servidores Públicos'] },
    ],
  },
  engenharia: {
    root: 'Engenharia',
    branches: [
      { label: 'Matemática', leaves: ['Cálculo I', 'Álgebra Linear', 'Equações Diferenciais'] },
      { label: 'Física', leaves: ['Mecânica', 'Eletromagnetismo', 'Termodinâmica'] },
      { label: 'Específicas', leaves: ['Materiais', 'Estruturas', 'Eletrônica'] },
      { label: 'Projeto', leaves: ['Metodologia', 'CAD/Software', 'Gestão de Projetos'] },
    ],
  },
  programacao: {
    root: 'Programação',
    branches: [
      { label: 'Fundamentos', leaves: ['Lógica', 'Algoritmos', 'Estruturas de Dados'] },
      { label: 'Web', leaves: ['HTML/CSS', 'JavaScript', 'React/Node'] },
      { label: 'Back-end', leaves: ['APIs REST', 'Banco de Dados', 'Segurança'] },
      { label: 'DevOps', leaves: ['Git', 'Docker', 'Cloud'] },
    ],
  },
};

const DEFAULT_MAP = {
  root: 'Estudos',
  branches: [
    { label: 'Fundamentos', leaves: ['Conceitos Básicos', 'Teoria Essencial', 'Pratica Inicial'] },
    { label: 'Intermediário', leaves: ['Aprofundamento', 'Exercícios', 'Revisão'] },
    { label: 'Avançado', leaves: ['Aplicação Prática', 'Projetos', 'Domínio Total'] },
    { label: 'Extras', leaves: ['Redação/Dissertação', 'Simulados', 'Revisão Final'] },
  ],
};

function detectArea(area, goal) {
  const text = `${area} ${goal}`.toLowerCase();
  if (/medic|medicina|saude|saúde|farmácia|farmacia|enfermagem|nutrição/i.test(text)) return 'medicina';
  if (/direito|jurídico|juridico|advogado|OAB/i.test(text)) return 'direito';
  if (/engenharia|engenheiro|mecânica|elétrica|civil/.test(text)) return 'engenharia';
  if (/program|dev|software|código|código|frontend|backend|fullstack/i.test(text)) return 'programacao';
  return 'default';
}

function buildMapFromTemplate(template, userId) {
  const nodes = [];
  const edges = [];
  const rootId = randomUUID();
  let xBase = 400, yBase = 50;

  nodes.push({
    id: rootId, label: template.root, subject: template.root,
    level: 0, x: xBase, y: yBase,
    type: 'root', completed: false, unlocked: true, parent_id: null,
  });

  template.branches.forEach((branch, bi) => {
    const branchId = randomUUID();
    const bx = 150 + bi * 210;
    const by = 200;
    nodes.push({
      id: branchId, label: branch.label, subject: branch.label,
      level: 1, x: bx, y: by,
      type: 'branch', completed: false, unlocked: bi === 0, parent_id: rootId,
    });
    edges.push({ from: rootId, to: branchId });

    branch.leaves.forEach((leaf, li) => {
      const leafId = randomUUID();
      nodes.push({
        id: leafId, label: leaf, subject: leaf,
        level: 2, x: bx - 20 + li * 100, y: 360,
        type: 'leaf', completed: false, unlocked: bi === 0 && li === 0, parent_id: branchId,
      });
      edges.push({ from: branchId, to: leafId });
    });
  });

  return { nodes, edges };
}

function generateChallenges(nodes) {
  const unlockedIncomplete = nodes.filter(n => n.unlocked && !n.completed && n.type !== 'root');
  const challenges = unlockedIncomplete.slice(0, 3).map(node => ({
    id: randomUUID(),
    title: `Dominar: ${node.label}`,
    description: `Complete o estudo de "${node.label}" com pelo menos 3 sessões de revisão e 5 flashcards criados sobre o tema.`,
    subject: node.subject,
    difficulty: node.level === 1 ? 3 : 5,
    xp_reward: node.level === 1 ? 50 : 100,
    status: 'pending',
    created_at: new Date().toISOString(),
    due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
  return challenges;
}

function dayKey(date) {
  return new Date(date).toISOString().split('T')[0];
}

function buildFocusSeries(sessions, days = 14) {
  const out = [];
  const base = new Date();
  const byDate = sessions.reduce((acc, s) => {
    const key = s.session_date || dayKey(s.created_at || new Date());
    acc[key] = (acc[key] || 0) + Number(s.duration_minutes || 0);
    return acc;
  }, {});

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const key = dayKey(d);
    out.push({ date: key, minutes: byDate[key] || 0 });
  }

  return out;
}

function calcTrend(currentValue, previousValue) {
  if (previousValue <= 0 && currentValue > 0) return 100;
  if (previousValue <= 0) return 0;
  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

function getWeakSubjects({ sessions, questionAttempts }) {
  const bySubjectMinutes = sessions.reduce((acc, s) => {
    const subject = (s.subject || 'Geral').trim();
    acc[subject] = (acc[subject] || 0) + Number(s.duration_minutes || 0);
    return acc;
  }, {});

  const bySubjectAccuracy = questionAttempts.reduce((acc, a) => {
    const subject = (a.subject || 'Geral').trim();
    if (!acc[subject]) acc[subject] = { correct: 0, total: 0 };
    acc[subject].total += 1;
    if (a.is_correct) acc[subject].correct += 1;
    return acc;
  }, {});

  return Object.keys({ ...bySubjectMinutes, ...bySubjectAccuracy })
    .map((subject) => {
      const mins = bySubjectMinutes[subject] || 0;
      const acc = bySubjectAccuracy[subject];
      const accuracy = acc && acc.total > 0 ? (acc.correct / acc.total) * 100 : 0;
      // Score alto = maior fragilidade
      const weaknessScore = Math.max(0, 70 - accuracy) + Math.max(0, 120 - mins) / 3;
      return { subject, mins, accuracy: Math.round(accuracy), weaknessScore };
    })
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, 5);
}

async function buildUserIntelligence(userId, nodes) {
  const { sessions, planner, flashcards, questionAttempts } = getDatabase();
  const now = new Date();

  const [userSessions, userPlanner, userFlashcards, userAttempts] = await Promise.all([
    sessions.find({ user_id: userId }).lean(),
    planner.find({ user_id: userId }).lean(),
    flashcards.find({ user_id: userId }).lean(),
    questionAttempts.find({ user_id: userId }).sort({ created_at: -1 }).limit(300).lean(),
  ]);

  const focusSeries14 = buildFocusSeries(userSessions, 14);
  const current14 = focusSeries14.reduce((sum, d) => sum + d.minutes, 0);

  const previousRangeStart = new Date(now);
  previousRangeStart.setDate(now.getDate() - 28);
  const previousRangeEnd = new Date(now);
  previousRangeEnd.setDate(now.getDate() - 14);

  const previous14 = userSessions
    .filter((s) => {
      const d = new Date(`${s.session_date || dayKey(s.created_at || now)}T12:00:00`);
      return d >= previousRangeStart && d < previousRangeEnd;
    })
    .reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);

  const plannerDone = userPlanner.filter((p) => p.status === 'done').length;
  const plannerRate = userPlanner.length > 0 ? Math.round((plannerDone / userPlanner.length) * 100) : 0;
  const flashcardReviews = userFlashcards.reduce((sum, f) => sum + Number(f.review_count || 0), 0);

  const accuracyBySubjectRaw = userAttempts.reduce((acc, a) => {
    const subject = (a.subject || 'Geral').trim();
    if (!acc[subject]) acc[subject] = { correct: 0, total: 0 };
    acc[subject].total += 1;
    if (a.is_correct) acc[subject].correct += 1;
    return acc;
  }, {});

  const accuracyBySubject = Object.entries(accuracyBySubjectRaw)
    .map(([subject, val]) => ({
      subject,
      accuracy: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      total: val.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 8);

  const weakSubjects = getWeakSubjects({ sessions: userSessions, questionAttempts: userAttempts });
  const trendPct = calcTrend(current14, previous14);

  const progressSignals = [];
  const regressionSignals = [];

  if (trendPct > 10) progressSignals.push(`Foco semanal em alta (${trendPct}%)`);
  if (plannerRate >= 65) progressSignals.push(`Boa execução de tarefas (${plannerRate}% concluídas)`);
  if (flashcardReviews >= 40) progressSignals.push(`Ritmo forte de revisões (${flashcardReviews} revisões)`);

  if (trendPct < -10) regressionSignals.push(`Queda de foco vs período anterior (${trendPct}%)`);
  if (plannerRate > 0 && plannerRate < 35) regressionSignals.push(`Muitas tarefas acumuladas (${plannerRate}% concluídas)`);
  if (accuracyBySubject.some((s) => s.total >= 5 && s.accuracy < 60)) {
    regressionSignals.push('Queda de acurácia em matérias-chave');
  }

  const unlockedSubjects = nodes
    .filter((n) => n.unlocked && !n.completed && n.type !== 'root')
    .map((n) => n.subject);

  const personalizedChallenges = weakSubjects
    .filter((w) => unlockedSubjects.some((s) => s.toLowerCase().includes(w.subject.toLowerCase()) || w.subject.toLowerCase().includes(s.toLowerCase())))
    .slice(0, 3)
    .map((w, idx) => {
      const baseXp = 70 + idx * 15;
      return {
        id: randomUUID(),
        title: `Sprint de recuperação: ${w.subject}`,
        description: `Complete 2 blocos Pomodoro de foco profundo e 8 questões de ${w.subject} para elevar seu desempenho.` ,
        subject: w.subject,
        difficulty: Math.min(5, Math.max(2, Math.round((100 - w.accuracy) / 20) + 2)),
        xp_reward: baseXp,
        status: 'pending',
        created_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });

  return {
    report: {
      focusSeries14,
      weeklyComparison: { current14, previous14, trendPct },
      plannerCompletionRate: plannerRate,
      flashcardReviews,
      accuracyBySubject,
      progressSignals,
      regressionSignals,
      weakSubjects,
    },
    personalizedChallenges,
  };
}

async function generateAndPersistMap(mindmaps, user) {
  const areaKey = detectArea(user.area, user.goal);
  const template = AREA_MAPS[areaKey] || { ...DEFAULT_MAP, root: user.area || 'Estudos' };
  const { nodes, edges } = buildMapFromTemplate(template, user.id || user._id);
  const challenges = generateChallenges(nodes);

  const map = await mindmaps.findOneAndUpdate(
    { _id: user.id || user._id },
    {
      $set: {
        _id: user.id || user._id,
        nodes,
        edges,
        challenges,
        total_xp: 0,
        updated_at: new Date().toISOString(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return map;
}

// ── GET /api/mindmap ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { mindmaps } = getDatabase();
    let map = await mindmaps.findOne({ _id: req.user.id });

    if (!map) {
      map = await generateAndPersistMap(mindmaps, req.user);
    }

    const intelligence = await buildUserIntelligence(req.user.id, map.nodes || []);

    // Mantém histórico aceito/concluído e recicla pendentes com base no perfil atual.
    const staticChallenges = (map.challenges || []).filter((c) => c.status !== 'pending');
    const adaptive = intelligence.personalizedChallenges;
    const nextChallenges = [...staticChallenges, ...adaptive];

    await mindmaps.findOneAndUpdate(
      { _id: req.user.id },
      { $set: { challenges: nextChallenges, updated_at: new Date().toISOString() } }
    );

    const responseMap = map.toObject ? map.toObject() : map;
    responseMap.challenges = nextChallenges;
    responseMap.insights = intelligence.report;

    res.json(responseMap);
  } catch (err) {
    // Auto-recuperacao para documentos antigos/corrompidos do MindMap.
    if (err?.name === 'ValidationError' || err?.name === 'CastError') {
      try {
        const { mindmaps } = getDatabase();
        await mindmaps.deleteOne({ _id: req.user.id });
        const recovered = await generateAndPersistMap(mindmaps, req.user);
        return res.json(recovered);
      } catch (recoverErr) {
        console.error('MindMap recovery error:', recoverErr);
      }
    }
    console.error('MindMap get error:', err);
    res.status(500).json({ error: 'Erro ao carregar mapa mental' });
  }
});

// ── GET /api/mindmap/insights ────────────────────────────────────────────────
router.get('/insights', async (req, res) => {
  try {
    const { mindmaps } = getDatabase();
    let map = await mindmaps.findOne({ _id: req.user.id });
    if (!map) {
      map = await generateAndPersistMap(mindmaps, req.user);
    }

    const intelligence = await buildUserIntelligence(req.user.id, map.nodes || []);
    res.json(intelligence.report);
  } catch (err) {
    console.error('MindMap insights error:', err);
    res.status(500).json({ error: 'Erro ao gerar insights do mapa mental' });
  }
});

// ── POST /api/mindmap/nodes/:nodeId/complete ───────────────────────────────────
router.post('/nodes/:nodeId/complete', async (req, res) => {
  try {
    const { mindmaps } = getDatabase();
    const map = await mindmaps.findOne({ _id: req.user.id });
    if (!map) return res.status(404).json({ error: 'Mapa não encontrado' });

    const nodeIndex = map.nodes.findIndex(n => n.id === req.params.nodeId);
    if (nodeIndex === -1) return res.status(404).json({ error: 'Nó não encontrado' });

    const node = map.nodes[nodeIndex];
    if (!node.unlocked) return res.status(400).json({ error: 'Nó bloqueado' });

    node.completed = true;

    // Unlock children
    map.nodes.forEach(n => {
      if (n.parent_id === node.id) n.unlocked = true;
    });

    // If branch completed, unlock next branch
    if (node.type === 'branch') {
      const branches = map.nodes.filter(n => n.type === 'branch');
      const completedBranches = branches.filter(n => n.completed);
      if (completedBranches.length < branches.length) {
        const nextBranch = branches.find(n => !n.completed && !n.unlocked);
        if (nextBranch) nextBranch.unlocked = true;
      }
    }

    // XP reward
    const xpGain = node.type === 'leaf' ? 30 : node.type === 'branch' ? 80 : 200;
    map.total_xp = (map.total_xp || 0) + xpGain;

    // Regenerate challenges for newly unlocked nodes
    const newChallenges = generateChallenges(map.nodes);
    map.challenges = [
      ...map.challenges.filter(c => c.status !== 'pending'),
      ...newChallenges,
    ];
    map.updated_at = new Date().toISOString();

    await mindmaps.findOneAndUpdate(
      { _id: req.user.id },
      { $set: { nodes: map.nodes, challenges: map.challenges, total_xp: map.total_xp, updated_at: map.updated_at } }
    );

    res.json({ ok: true, xp_gained: xpGain, total_xp: map.total_xp, map });
  } catch (err) {
    console.error('MindMap complete node error:', err);
    res.status(500).json({ error: 'Erro ao completar nó' });
  }
});

// ── PUT /api/mindmap/challenges/:challengeId ───────────────────────────────────
router.put('/challenges/:challengeId', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const { mindmaps } = getDatabase();
    const map = await mindmaps.findOne({ _id: req.user.id });
    if (!map) return res.status(404).json({ error: 'Mapa não encontrado' });

    const challenge = map.challenges.find(c => c.id === req.params.challengeId);
    if (!challenge) return res.status(404).json({ error: 'Desafio não encontrado' });

    challenge.status = status;
    let xpGained = 0;

    if (status === 'completed') {
      xpGained = challenge.xp_reward || 0;
      map.total_xp = (map.total_xp || 0) + xpGained;

      // Mark corresponding node as completed if exists
      const relatedNode = map.nodes.find(n => n.subject === challenge.subject && !n.completed);
      if (relatedNode) {
        relatedNode.completed = true;
        map.nodes.forEach(n => { if (n.parent_id === relatedNode.id) n.unlocked = true; });
      }

      // Add new challenge to replace
      const newChallenges = generateChallenges(map.nodes);
      if (newChallenges.length > 0) {
        const fresh = newChallenges.find(nc => !map.challenges.find(c => c.title === nc.title));
        if (fresh) map.challenges.push(fresh);
      }
    }

    map.updated_at = new Date().toISOString();
    await mindmaps.findOneAndUpdate(
      { _id: req.user.id },
      { $set: { challenges: map.challenges, nodes: map.nodes, total_xp: map.total_xp, updated_at: map.updated_at } }
    );

    res.json({ ok: true, xp_gained: xpGained, total_xp: map.total_xp });
  } catch (err) {
    console.error('MindMap challenge update error:', err);
    res.status(500).json({ error: 'Erro ao atualizar desafio' });
  }
});

// ── POST /api/mindmap/tigas-action ────────────────────────────────────────────
// Allows Tigas AI to manipulate the map based on conversation context
router.post('/tigas-action', async (req, res) => {
  try {
    const { action, payload } = req.body;
    if (!action || !payload) return res.status(400).json({ error: 'action e payload obrigatórios' });

    const { mindmaps } = getDatabase();
    const map = await mindmaps.findOne({ _id: req.user.id });
    if (!map) return res.status(404).json({ error: 'Mapa não encontrado' });

    if (action === 'complete_topic') {
      const { topic_label } = payload;
      if (!topic_label) return res.status(400).json({ error: 'topic_label obrigatório' });
      const topicLower = topic_label.toLowerCase();
      const node = map.nodes.find(n =>
        n.unlocked && !n.completed &&
        (n.label.toLowerCase().includes(topicLower) || topicLower.includes(n.label.toLowerCase()))
      );
      if (!node) return res.json({ ok: false, reason: 'node_not_found' });

      node.completed = true;
      map.nodes.forEach(n => { if (n.parent_id === node.id) n.unlocked = true; });
      if (node.type === 'branch') {
        const branches = map.nodes.filter(n => n.type === 'branch');
        const nextBranch = branches.find(n => !n.completed && !n.unlocked);
        if (nextBranch) nextBranch.unlocked = true;
      }
      const xpGain = node.type === 'leaf' ? 30 : 80;
      map.total_xp = (map.total_xp || 0) + xpGain;
      map.updated_at = new Date().toISOString();
      await mindmaps.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { nodes: map.nodes, total_xp: map.total_xp, updated_at: map.updated_at } }
      );
      return res.json({ ok: true, completed_node: node, xp_gained: xpGain, map });
    }

    if (action === 'add_topic') {
      const { topic_label } = payload;
      if (!topic_label) return res.status(400).json({ error: 'topic_label obrigatório' });
      const branches = map.nodes.filter(n => n.type === 'branch');
      const targetBranch = branches.find(b => !b.completed && b.unlocked) || branches[0];
      if (!targetBranch) return res.json({ ok: false, reason: 'no_branch_found' });
      const leaves = map.nodes.filter(n => n.parent_id === targetBranch.id);
      const newLeaf = {
        id: randomUUID(),
        label: topic_label.charAt(0).toUpperCase() + topic_label.slice(1),
        subject: topic_label,
        level: 2,
        x: targetBranch.x - 30 + leaves.length * 90,
        y: 450,
        type: 'leaf',
        completed: false,
        unlocked: targetBranch.unlocked,
        parent_id: targetBranch.id,
      };
      map.nodes.push(newLeaf);
      map.edges.push({ from: targetBranch.id, to: newLeaf.id });
      map.updated_at = new Date().toISOString();
      await mindmaps.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { nodes: map.nodes, edges: map.edges, updated_at: map.updated_at } }
      );
      return res.json({ ok: true, added_node: newLeaf, map });
    }

    return res.status(400).json({ error: 'Ação inválida. Use: complete_topic, add_topic' });
  } catch (err) {
    console.error('MindMap tigas-action error:', err);
    res.status(500).json({ error: 'Erro na ação do Tigas' });
  }
});

// ── POST /api/mindmap/reset ────────────────────────────────────────────────────
router.post('/reset', async (req, res) => {
  try {
    const { mindmaps } = getDatabase();
    await mindmaps.deleteOne({ _id: req.user.id });
    res.json({ ok: true, message: 'Mapa resetado. Acesse novamente para gerar um novo.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao resetar mapa' });
  }
});

module.exports = router;
