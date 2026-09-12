const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAccess);

const COURSE_QUESTIONS = {
  direito: [
    ['Constitucional', 'O princípio da legalidade na Administração Pública significa que o agente público:', ['Pode fazer tudo que não é proibido', 'Só pode agir conforme autorização legal', 'Age conforme sua preferência', 'Pode afastar a lei por costume'], 1, 'A Administração Pública está vinculada à lei.'],
    ['Administrativo', 'A modalidade de licitação voltada à aquisição de bens e serviços comuns é:', ['Concurso', 'Leilão', 'Pregão', 'Diálogo competitivo'], 2, 'O pregão é utilizado para bens e serviços comuns.'],
    ['Civil', 'A responsabilidade civil subjetiva exige, em regra, a demonstração de:', ['Dano apenas', 'Dano e nexo causal, sem culpa', 'Dano, nexo causal e culpa', 'Enriquecimento sem causa'], 2, 'Na responsabilidade subjetiva, a culpa é necessária.'],
  ],
  enem: [
    ['Matemática', 'Se uma função afim passa pelos pontos (0, 3) e (2, 7), seu coeficiente angular é:', ['1', '2', '3', '4'], 1, 'O coeficiente é (7 - 3) / 2 = 2.'],
    ['Português', 'Em um texto argumentativo, a tese corresponde:', ['Ao exemplo final', 'À ideia central defendida', 'À referência bibliográfica', 'À descrição do cenário'], 1, 'A tese é a ideia central defendida.'],
    ['História', 'A Constituição brasileira conhecida como Constituição Cidadã foi promulgada em:', ['1964', '1967', '1988', '1992'], 2, 'A Constituição Federal vigente foi promulgada em 1988.'],
  ],
  concursos: [
    ['Português', 'A finalidade principal da coesão textual é:', ['Criar contradições', 'Ligar formalmente as partes do texto', 'Substituir a argumentação', 'Eliminar os verbos'], 1, 'A coesão conecta as partes do texto.'],
    ['Raciocínio Lógico', 'A negação da proposição “todos os candidatos estudaram” é:', ['Nenhum candidato estudou', 'Pelo menos um candidato não estudou', 'Todos não estudaram', 'Alguns candidatos estudaram'], 1, 'A negação de “todos” é “pelo menos um não”.'],
    ['Constitucional', 'São princípios expressos da Administração Pública no artigo 37 da Constituição:', ['LIMPE', 'Culpabilidade e ampla defesa', 'Livre iniciativa e concorrência', 'Anterioridade e noventena'], 0, 'Legalidade, impessoalidade, moralidade, publicidade e eficiência formam LIMPE.'],
  ],
  engenharia: [
    ['Cálculo', 'A derivada de f(x) = x² no ponto x = 3 é:', ['3', '6', '9', '12'], 1, 'A derivada é 2x; em x = 3, resulta 6.'],
    ['Física', 'Pela segunda lei de Newton, a força resultante é igual a:', ['Massa dividida pela aceleração', 'Massa vezes aceleração', 'Aceleração dividida pela massa', 'Massa vezes velocidade'], 1, 'A segunda lei é F = m · a.'],
    ['Álgebra', 'O determinante da matriz [[1, 2], [3, 4]] é:', ['-2', '2', '5', '10'], 0, 'O determinante é 1·4 - 2·3 = -2.'],
  ],
  faculdade: [
    ['Metodologia de Estudo', 'A revisão espaçada recomenda:', ['Revisar apenas na véspera', 'Distribuir revisões ao longo do tempo', 'Evitar testes práticos', 'Usar apenas leitura passiva'], 1, 'A técnica distribui revisões em intervalos crescentes.'],
    ['Planejamento', 'Uma boa sessão de estudo deve começar com:', ['Uma meta específica e mensurável', 'Várias tarefas sem prioridade', 'Notificações ativadas', 'A leitura de todo o material'], 0, 'Metas específicas orientam o foco e medem o progresso.'],
    ['Leitura Ativa', 'Uma prática de leitura ativa é:', ['Sublinhar tudo', 'Fazer perguntas e recuperar ideias sem consultar o texto', 'Ler sem pausas', 'Ignorar exemplos'], 1, 'Perguntas e recuperação ativa fortalecem a retenção.'],
  ],
};

function resolveCourseKey(area) {
  const normalized = String(area || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/medicina|residencia|revalida/.test(normalized)) return 'medicina';
  if (/direito|oab|magistratura/.test(normalized)) return 'direito';
  if (/enem|vestibular/.test(normalized)) return 'enem';
  if (/concurso|militar|publico/.test(normalized)) return 'concursos';
  if (/engenharia/.test(normalized)) return 'engenharia';
  return 'faculdade';
}

const SEED_QUESTIONS = [
  {
    _id: 'qb-1',
    subject: 'Cardiologia',
    phase: 'clinico',
    statement: 'Qual classe de anti-hipertensivo é primeira linha para pacientes com diabetes e albuminúria?',
    options: ['Betabloqueador', 'IECA/BRA', 'Diurético de alça', 'Nitrato'],
    correct_index: 1,
    explanation: 'IECA ou BRA oferecem proteção renal em pacientes com diabetes e albuminúria.',
    difficulty: 3,
  },
  {
    _id: 'qb-2',
    subject: 'Pediatria',
    phase: 'internato',
    statement: 'No manejo inicial da bronquiolite viral aguda, a conduta principal é:',
    options: ['Antibiótico empírico', 'Corticoide sistêmico para todos', 'Suporte clínico e hidratação', 'Nebulização com adrenalina para todos'],
    correct_index: 2,
    explanation: 'A base é suporte, monitorização e hidratação. Outras medidas são caso a caso.',
    difficulty: 2,
  },
  {
    _id: 'qb-3',
    subject: 'Farmacologia',
    phase: 'basico',
    statement: 'A meia-vida de uma droga é o tempo necessário para:',
    options: ['Duplicar a concentração plasmática', 'Reduzir a concentração plasmática em 50%', 'Eliminar totalmente a droga', 'Atingir o pico de ação'],
    correct_index: 1,
    explanation: 'Por definição, meia-vida corresponde à queda de 50% da concentração plasmática.',
    difficulty: 1,
  },
  {
    _id: 'qb-4',
    subject: 'Cirurgia',
    phase: 'internato',
    statement: 'Paciente com dor em FID, febre e leucocitose. Diagnóstico mais provável:',
    options: ['Colecistite aguda', 'Pancreatite aguda', 'Apendicite aguda', 'Diverticulite de sigmoide'],
    correct_index: 2,
    explanation: 'O quadro clínico é clássico de apendicite aguda.',
    difficulty: 2,
  },
];

async function ensureSeed() {
  const { questionBank } = getDatabase();
  const now = new Date().toISOString();
  const legacyQuestions = await questionBank.find({ course: { $exists: false } }).lean().exec();
  await Promise.all(legacyQuestions.map((question) => questionBank.updateOne(
    { _id: question._id },
    { $set: { course: 'medicina' } },
  )));
  const courseKeys = ['medicina', ...Object.keys(COURSE_QUESTIONS)];
  const counts = {};
  await Promise.all(courseKeys.map(async (course) => {
    counts[course] = await questionBank.countDocuments({ course });
  }));
  const payload = [];

  if (!counts.medicina) {
    payload.push(...SEED_QUESTIONS.map((question) => ({ ...question, course: 'medicina', created_at: now })));
  }

  Object.entries(COURSE_QUESTIONS).forEach(([course, questions]) => {
    if (counts[course]) return;
    questions.forEach(([subject, statement, options, correct_index, explanation], index) => {
      payload.push({
        _id: `qb-${course}-${index + 1}`,
        course,
        subject,
        phase: 'geral',
        statement,
        options,
        correct_index,
        explanation,
        difficulty: index + 1,
        created_at: now,
      });
    });
  });

  if (payload.length > 0) await questionBank.insertMany(payload);
}

function sanitizeQuestion(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { correct_index: _c, __v, ...rest } = obj;
  return { ...rest, id: rest._id };
}

// GET /api/question-bank
router.get('/', async (req, res) => {
  try {
    await ensureSeed();

    let subject = String(req.query.subject || '').trim();
    const phase = String(req.query.phase || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

    const { users } = getDatabase();
    const user = await users.findOne({ _id: req.user.id });
    const course = resolveCourseKey(user?.area);
    const query = { course };
    if (subject) query.subject = new RegExp(subject, 'i');
    if (phase && course === 'medicina') query.phase = phase;

    const { questionBank, questionAttempts } = getDatabase();
    const questions = await questionBank.find(query).limit(limit);

    const attempts = await questionAttempts.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(200);
    const total = attempts.length;
    const correct = attempts.filter((a) => a.is_correct).length;

    return res.json({
      items: questions.map(sanitizeQuestion),
      stats: {
        total_attempts: total,
        correct_attempts: correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Question bank list error:', error);
    return res.status(500).json({ error: 'Erro ao carregar banco de questões' });
  }
});

// POST /api/question-bank/attempt
router.post('/attempt', async (req, res) => {
  try {
    const { question_id, selected_index } = req.body;
    if (!question_id || selected_index === undefined) {
      return res.status(400).json({ error: 'question_id e selected_index são obrigatórios' });
    }

    const { questionBank, questionAttempts } = getDatabase();
    const question = await questionBank.findOne({ _id: question_id });
    if (!question) return res.status(404).json({ error: 'Questão não encontrada' });

    const { users } = getDatabase();
    const user = await users.findOne({ _id: req.user.id });
    if (question.course !== resolveCourseKey(user?.area)) {
      return res.status(403).json({ error: 'Esta questão não pertence ao curso selecionado.' });
    }

    const isCorrect = Number(selected_index) === Number(question.correct_index);

    const attempt = new questionAttempts({
      _id: randomUUID(),
      user_id: req.user.id,
      question_id: question._id,
      subject: question.subject,
      phase: question.phase,
      selected_index: Number(selected_index),
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    });
    await attempt.save();

    const recent = await questionAttempts.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(100);
    const total = recent.length;
    const correct = recent.filter((a) => a.is_correct).length;

    return res.json({
      result: {
        is_correct: isCorrect,
        correct_index: question.correct_index,
        explanation: question.explanation,
      },
      stats: {
        total_attempts: total,
        correct_attempts: correct,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Question attempt error:', error);
    return res.status(500).json({ error: 'Erro ao registrar tentativa' });
  }
});

// POST /api/question-bank/simulate
router.post('/simulate', async (req, res) => {
  try {
    await ensureSeed();

    const phase = String(req.body.phase || 'geral').trim();
    const count = Math.min(Math.max(Number(req.body.count || 10), 5), 40);
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const durationSeconds = Math.max(Number(req.body.duration_seconds || 0), 0);

    const { users } = getDatabase();
    const user = await users.findOne({ _id: req.user.id });
    const course = resolveCourseKey(user?.area);
    const { questionBank, mockExamResults } = getDatabase();
    const query = { course };
    if (phase && phase !== 'geral' && course === 'medicina') query.phase = phase;
    const candidates = await questionBank.find(query);

    if (candidates.length === 0) {
      return res.status(400).json({ error: 'Sem questões para a fase selecionada' });
    }

    // Se não vier respostas, retorna apenas o caderno do simulado.
    if (answers.length === 0) {
      const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, count);
      return res.json({
        mode: 'questions',
        phase: phase || 'geral',
        items: shuffled.map(sanitizeQuestion),
      });
    }

    const answerMap = new Map(answers.map((a) => [String(a.question_id), Number(a.selected_index)]));
    const relatedIds = [...answerMap.keys()];
    const questions = await questionBank.find({ _id: { $in: relatedIds } });

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Respostas inválidas para simulado' });
    }

    let correct = 0;
    const details = questions.map((q) => {
      const selected = answerMap.get(String(q._id));
      const isCorrect = Number(selected) === Number(q.correct_index);
      if (isCorrect) correct += 1;
      return {
        question_id: q._id,
        selected_index: selected,
        correct_index: q.correct_index,
        is_correct: isCorrect,
        explanation: q.explanation,
      };
    });

    const total = details.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    const result = new mockExamResults({
      _id: randomUUID(),
      user_id: req.user.id,
      phase: phase || 'geral',
      total_questions: total,
      correct_answers: correct,
      accuracy,
      duration_seconds: durationSeconds,
      created_at: new Date().toISOString(),
    });
    await result.save();

    const best = await mockExamResults.find({ user_id: req.user.id }).sort({ accuracy: -1, created_at: -1 }).limit(1);
    const recent = await mockExamResults.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(10);

    return res.json({
      mode: 'result',
      result: {
        total_questions: total,
        correct_answers: correct,
        accuracy,
        duration_seconds: durationSeconds,
      },
      details,
      ranking: {
        personal_best: best[0]
          ? {
              accuracy: best[0].accuracy,
              correct_answers: best[0].correct_answers,
              total_questions: best[0].total_questions,
              created_at: best[0].created_at,
            }
          : null,
        recent: recent.map((r) => ({
          id: r._id,
          accuracy: r.accuracy,
          correct_answers: r.correct_answers,
          total_questions: r.total_questions,
          duration_seconds: r.duration_seconds,
          phase: r.phase,
          created_at: r.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Question simulate error:', error);
    return res.status(500).json({ error: 'Erro ao executar simulado' });
  }
});

// GET /api/question-bank/simulate/ranking
router.get('/simulate/ranking', async (req, res) => {
  try {
    const { mockExamResults } = getDatabase();
    const best = await mockExamResults.find({ user_id: req.user.id }).sort({ accuracy: -1, created_at: -1 }).limit(1);
    const recent = await mockExamResults.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(10);

    return res.json({
      personal_best: best[0]
        ? {
            accuracy: best[0].accuracy,
            correct_answers: best[0].correct_answers,
            total_questions: best[0].total_questions,
            duration_seconds: best[0].duration_seconds,
            phase: best[0].phase,
            created_at: best[0].created_at,
          }
        : null,
      recent: recent.map((r) => ({
        id: r._id,
        accuracy: r.accuracy,
        correct_answers: r.correct_answers,
        total_questions: r.total_questions,
        duration_seconds: r.duration_seconds,
        phase: r.phase,
        created_at: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Question ranking error:', error);
    return res.status(500).json({ error: 'Erro ao carregar ranking pessoal' });
  }
});

// CRUD Mongoose do Banco de Questões (admin, manutenção, integração)
const questionsRouter = require('./questions');
router.use('/questions', questionsRouter);

module.exports = router;
