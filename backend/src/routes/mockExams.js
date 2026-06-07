const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAccess);

// POST /api/mock-exams/create - Create new mock exam
router.post('/create', async (req, res) => {
  try {
    const { name, subject, phase, questions, time_limit_minutes = 60 } = req.body;

    if (!name || !subject || !phase || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Dados incompletos para criar exame' });
    }

    const { mockExams } = getDatabase();

    const examId = randomUUID();
    const now = new Date().toISOString();

    // Group questions by subject
    const questionGroups = {};
    questions.forEach(q => {
      const qSubject = q.subject || 'Geral';
      if (!questionGroups[qSubject]) {
        questionGroups[qSubject] = { subject: qSubject, count: 0, difficulty: q.difficulty || 1 };
      }
      questionGroups[qSubject].count += 1;
    });

    const newExam = {
      _id: examId,
      user_id: req.user.id,
      name,
      subject,
      phase,
      total_questions: questions.length,
      time_limit_minutes,
      question_ids: questions.map(q => q.id || q._id),
      question_groups: Object.values(questionGroups),
      started_at: null,
      finished_at: null,
      duration_seconds: 0,
      answered_count: 0,
      correct_count: 0,
      accuracy_percentage: 0,
      score_percentage: 0,
      questions_performance: [],
      peers_average: 0,
      percentile_rank: 0,
      results_reviewed: false,
      status: 'created', // created, in_progress, completed
      created_at: now,
      updated_at: now,
    };

    await mockExams.insertOne(newExam);

    res.status(201).json({
      exam_id: examId,
      name,
      total_questions: questions.length,
      time_limit_minutes,
      created_at: now,
    });
  } catch (error) {
    console.error('Create mock exam error:', error);
    res.status(500).json({ error: 'Erro ao criar exame' });
  }
});

// POST /api/mock-exams/:id/start - Start exam session
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { mockExams, questionBank } = getDatabase();

    const exam = await mockExams.findOne({ _id: id, user_id: req.user.id });
    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' });
    }

    if (exam.status !== 'created') {
      return res.status(400).json({ error: 'Exame já foi iniciado' });
    }

    // Fetch questions
    const questions = await questionBank
      .find({ _id: { $in: exam.question_ids } })
      .toArray();

    if (questions.length === 0) {
      return res.status(400).json({ error: 'Nenhuma questão encontrada' });
    }

    // Update exam status
    const now = new Date().toISOString();
    await mockExams.updateOne(
      { _id: id },
      {
        $set: {
          started_at: now,
          status: 'in_progress',
          updated_at: now,
        },
      }
    );

    // Return questions without answers
    const questionsForClient = questions.map(q => {
      const qObj = q.toObject ? q.toObject() : { ...q };
      return {
        id: qObj._id,
        subject: qObj.subject,
        statement: qObj.statement,
        options: qObj.options,
        phase: qObj.phase,
        difficulty: qObj.difficulty,
        // Don't send correct_index or explanation
      };
    });

    res.json({
      exam_id: id,
      time_limit_minutes: exam.time_limit_minutes,
      total_questions: exam.total_questions,
      questions: questionsForClient,
      started_at: now,
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Erro ao iniciar exame' });
  }
});

// POST /api/mock-exams/:id/submit-answer - Record answer
router.post('/:id/submit-answer', async (req, res) => {
  try {
    const { id } = req.params;
    const { question_id, selected_index, time_spent_seconds = 0 } = req.body;

    const { mockExams, questionBank } = getDatabase();

    const exam = await mockExams.findOne({ _id: id, user_id: req.user.id });
    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' });
    }

    // Get question to check answer
    const question = await questionBank.findOne({ _id: question_id });
    if (!question) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }

    const qObj = question.toObject ? question.toObject() : { ...question };
    const isCorrect = qObj.correct_index === selected_index;

    // Add to performance tracking
    const performance = {
      question_id,
      selected_index,
      is_correct: isCorrect,
      time_seconds: time_spent_seconds,
      difficulty: qObj.difficulty || 1,
      subject: qObj.subject,
    };

    // Update exam - increment answered count
    const updateData = {
      $push: { questions_performance: performance },
      $inc: {
        answered_count: 1,
        correct_count: isCorrect ? 1 : 0,
      },
      $set: { updated_at: new Date().toISOString() },
    };

    await mockExams.updateOne({ _id: id }, updateData);

    res.json({
      success: true,
      is_correct: isCorrect,
      correct_answer: isCorrect ? null : qObj.correct_index,
      explanation: qObj.explanation || 'Sem explicação disponível',
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Erro ao registrar resposta' });
  }
});

// POST /api/mock-exams/:id/finish - Complete exam and calculate scores
router.post('/:id/finish', async (req, res) => {
  try {
    const { id } = req.params;
    const { mockExams } = getDatabase();

    const exam = await mockExams.findOne({ _id: id, user_id: req.user.id });
    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' });
    }

    if (exam.status !== 'in_progress') {
      return res.status(400).json({ error: 'Exame não está em progresso' });
    }

    const finishedAt = new Date().toISOString();
    const startedAt = new Date(exam.started_at);
    const duration = Math.floor((new Date(finishedAt) - startedAt) / 1000);

    // Calculate accuracy
    const accuracy = exam.answered_count > 0
      ? Math.round((exam.correct_count / exam.answered_count) * 100)
      : 0;

    // Calculate weighted score (difficulty-based)
    let totalScore = 0;
    let totalWeight = 0;
    exam.questions_performance.forEach(perf => {
      const weight = perf.difficulty || 1;
      totalWeight += weight;
      if (perf.is_correct) {
        totalScore += weight;
      }
    });

    const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

    // Calculate percentile rank (simplified - based on all exams in same phase)
    const allExams = await mockExams
      .find({ phase: exam.phase, status: 'completed' })
      .toArray();

    let percentile = 50;
    if (allExams.length > 0) {
      const betterScores = allExams.filter(e => e.score_percentage > score).length;
      percentile = Math.round(((allExams.length - betterScores) / allExams.length) * 100);
    }

    const peersAvg = allExams.length > 0
      ? Math.round(
        allExams.reduce((sum, e) => sum + e.score_percentage, 0) / allExams.length
      )
      : 0;

    // Update exam with results
    const now = new Date().toISOString();
    await mockExams.updateOne(
      { _id: id },
      {
        $set: {
          finished_at: finishedAt,
          duration_seconds: duration,
          accuracy_percentage: accuracy,
          score_percentage: score,
          percentile_rank: percentile,
          peers_average: peersAvg,
          status: 'completed',
          updated_at: now,
        },
      }
    );

    res.json({
      exam_id: id,
      accuracy_percentage: accuracy,
      score_percentage: score,
      percentile_rank: percentile,
      correct_count: exam.correct_count,
      answered_count: exam.answered_count,
      duration_seconds: duration,
      finished_at: finishedAt,
    });
  } catch (error) {
    console.error('Finish exam error:', error);
    res.status(500).json({ error: 'Erro ao finalizar exame' });
  }
});

// GET /api/mock-exams/:id/results - Get detailed results
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const { mockExams, questionBank } = getDatabase();

    const exam = await mockExams.findOne({ _id: id, user_id: req.user.id });
    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' });
    }

    if (exam.status !== 'completed') {
      return res.status(400).json({ error: 'Exame ainda não foi finalizado' });
    }

    // Get question details for each performance record
    const performanceWithDetails = await Promise.all(
      exam.questions_performance.map(async perf => {
        const question = await questionBank.findOne({ _id: perf.question_id });
        const qObj = question?.toObject ? question.toObject() : question;

        return {
          question_id: perf.question_id,
          statement: qObj?.statement || 'Questão indisponível',
          subject: perf.subject,
          difficulty: perf.difficulty,
          selected_index: perf.selected_index,
          correct_index: qObj?.correct_index,
          is_correct: perf.is_correct,
          time_seconds: perf.time_seconds,
          explanation: qObj?.explanation || 'Sem explicação',
        };
      })
    );

    // Group by subject for breakdown
    const breakdown = {};
    exam.questions_performance.forEach(perf => {
      const subject = perf.subject || 'Geral';
      if (!breakdown[subject]) {
        breakdown[subject] = { correct: 0, total: 0 };
      }
      breakdown[subject].total += 1;
      if (perf.is_correct) breakdown[subject].correct += 1;
    });

    const subjectBreakdown = Object.entries(breakdown).map(([subject, data]) => ({
      subject,
      correct: data.correct,
      total: data.total,
      accuracy: Math.round((data.correct / data.total) * 100),
    }));

    res.json({
      exam_id: id,
      name: exam.name,
      phase: exam.phase,
      accuracy_percentage: exam.accuracy_percentage,
      score_percentage: exam.score_percentage,
      percentile_rank: exam.percentile_rank,
      peers_average: exam.peers_average,
      correct_count: exam.correct_count,
      answered_count: exam.answered_count,
      total_questions: exam.total_questions,
      duration_seconds: exam.duration_seconds,
      started_at: exam.started_at,
      finished_at: exam.finished_at,
      performance: performanceWithDetails,
      subject_breakdown: subjectBreakdown,
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Erro ao buscar resultados' });
  }
});

// GET /api/mock-exams/history - Get all exam attempts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { mockExams } = getDatabase();

    const skip = (Number(page) - 1) * Number(limit);

    const exams = await mockExams
      .find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    const total = await mockExams.countDocuments({ user_id: req.user.id });

    const items = exams.map(exam => {
      const obj = exam.toObject ? exam.toObject() : exam;
      return {
        id: obj._id,
        name: obj.name,
        subject: obj.subject,
        phase: obj.phase,
        accuracy: obj.accuracy_percentage,
        score: obj.score_percentage,
        percentile: obj.percentile_rank,
        status: obj.status,
        created_at: obj.created_at,
        finished_at: obj.finished_at,
      };
    });

    res.json({
      items,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de exames' });
  }
});

// GET /api/mock-exams/performance-analysis - Performance by subject
router.get('/performance-analysis', async (req, res) => {
  try {
    const { mockExams } = getDatabase();

    // Get all completed exams for current user
    const exams = await mockExams
      .find({ user_id: req.user.id, status: 'completed' })
      .toArray();

    if (exams.length === 0) {
      return res.json({
        performance_by_subject: [],
        overall_accuracy: 0,
        exam_count: 0,
      });
    }

    // Aggregate performance by subject
    const subjectStats = {};
    exams.forEach(exam => {
      exam.questions_performance?.forEach(perf => {
        const subject = perf.subject || 'Geral';
        if (!subjectStats[subject]) {
          subjectStats[subject] = { correct: 0, total: 0 };
        }
        subjectStats[subject].total += 1;
        if (perf.is_correct) subjectStats[subject].correct += 1;
      });
    });

    const performanceBySubject = Object.entries(subjectStats)
      .map(([subject, data]) => ({
        subject,
        correct: data.correct,
        total: data.total,
        accuracy: Math.round((data.correct / data.total) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // Weakest first

    const totalCorrect = exams.reduce((sum, e) => sum + e.correct_count, 0);
    const totalAnswered = exams.reduce((sum, e) => sum + e.answered_count, 0);
    const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    res.json({
      performance_by_subject: performanceBySubject,
      overall_accuracy: overallAccuracy,
      exam_count: exams.length,
      recent_score: exams[0]?.score_percentage || 0,
      best_score: Math.max(...exams.map(e => e.score_percentage || 0)),
    });
  } catch (error) {
    console.error('Performance analysis error:', error);
    res.status(500).json({ error: 'Erro ao analisar desempenho' });
  }
});

module.exports = router;
