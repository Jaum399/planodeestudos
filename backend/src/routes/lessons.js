const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const LessonProgress = require('../models/LessonProgress');
const LessonFeedback = require('../models/LessonFeedback');
const { authenticate, requireAccess } = require('../middleware/auth');

router.use(authenticate, requireAccess);

function normalizeLessonId(raw) {
  if (!raw) return null;
  return String(raw);
}

function isPremiumUser(user) {
  return user?.plan && user.plan !== 'free';
}

async function enrichLessonsForUser(lessons, userId, user) {
  const lessonIds = lessons.map((lesson) => lesson._id);
  const progressList = await LessonProgress.find({ user_id: userId, lesson_id: { $in: lessonIds } }).lean();
  const progressMap = new Map(progressList.map((p) => [normalizeLessonId(p.lesson_id), p]));

  return lessons.map((lesson) => {
    const lessonId = normalizeLessonId(lesson._id);
    const progress = progressMap.get(lessonId) || null;
    const canAccess = lesson.free || isPremiumUser(user);

    return {
      ...lesson,
      canAccess,
      progress: progress
        ? {
            watched_seconds: progress.watched_seconds || 0,
            duration_seconds: progress.duration_seconds || lesson.duration_seconds || 0,
            completed: !!progress.completed,
            last_position_seconds: progress.last_position_seconds || 0,
            updatedAt: progress.updatedAt,
          }
        : null,
    };
  });
}

async function getRoadmapForUser(user) {
  const userId = user.id;
  const courses = await Course.find().sort({ order: 1, createdAt: 1 }).lean();
  const lessons = await Lesson.find({ published: true }).sort({ course_id: 1, order: 1, createdAt: 1 }).lean();

  const progressList = await LessonProgress.find({ user_id: userId }).lean();
  const progressMap = new Map(progressList.map((p) => [normalizeLessonId(p.lesson_id), p]));

  const groupedByCourse = new Map();
  for (const lesson of lessons) {
    const key = normalizeLessonId(lesson.course_id) || 'no-course';
    if (!groupedByCourse.has(key)) groupedByCourse.set(key, []);
    groupedByCourse.get(key).push(lesson);
  }

  const courseCards = [];

  for (const course of courses) {
    const courseId = normalizeLessonId(course._id);
    const courseLessons = groupedByCourse.get(courseId) || [];

    let previousCompleted = true;
    const lessonsWithUnlock = courseLessons.map((lesson, idx) => {
      const lessonId = normalizeLessonId(lesson._id);
      const progress = progressMap.get(lessonId) || null;
      const completed = !!progress?.completed;
      const unlockedBySequence = idx === 0 ? true : previousCompleted;
      const canAccess = (lesson.free || isPremiumUser(user)) && unlockedBySequence;
      previousCompleted = completed;

      return {
        ...lesson,
        canAccess,
        unlockedBySequence,
        progress: progress
          ? {
              watched_seconds: progress.watched_seconds || 0,
              duration_seconds: progress.duration_seconds || lesson.duration_seconds || 0,
              completed,
              last_position_seconds: progress.last_position_seconds || 0,
              updatedAt: progress.updatedAt,
            }
          : null,
      };
    });

    const completedCount = lessonsWithUnlock.filter((l) => l.progress?.completed).length;
    const totalCount = lessonsWithUnlock.length;

    courseCards.push({
      ...course,
      total_lessons: totalCount,
      completed_lessons: completedCount,
      completion_pct: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      lessons: lessonsWithUnlock,
    });
  }

  return courseCards;
}

// Listar todas as aulas
router.get('/', async (req, res) => {
  try {
    const lessons = await Lesson.find({ published: true }).sort({ order: 1, createdAt: 1 }).lean();
    const enriched = await enrichLessonsForUser(lessons, req.user.id, req.user);
    res.json(enriched);
  } catch (err) {
    console.error('List lessons error:', err);
    res.status(500).json({ error: 'Erro ao listar aulas' });
  }
});

// Roadmap de cursos/trilhas com desbloqueio progressivo
router.get('/courses/roadmap', async (req, res) => {
  try {
    const roadmap = await getRoadmapForUser(req.user);
    res.json(roadmap);
  } catch (err) {
    console.error('Lessons roadmap error:', err);
    res.status(500).json({ error: 'Erro ao carregar trilhas' });
  }
});

// Listar progresso do usuário
router.get('/progress/all', async (req, res) => {
  try {
    const progress = await LessonProgress.find({ user_id: req.user.id }).lean();
    res.json(progress);
  } catch (err) {
    console.error('List lesson progress error:', err);
    res.status(500).json({ error: 'Erro ao listar progresso das aulas' });
  }
});

// Buscar aula por ID
router.get('/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean();
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });

    const enriched = await enrichLessonsForUser([lesson], req.user.id, req.user);
    res.json(enriched[0]);
  } catch (err) {
    console.error('Get lesson error:', err);
    res.status(500).json({ error: 'Erro ao buscar aula' });
  }
});

// Salvar progresso de uma aula
router.put('/:id/progress', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean();
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });

    const watched_seconds = Math.max(0, Number(req.body.watched_seconds || 0));
    const duration_seconds = Math.max(0, Number(req.body.duration_seconds || lesson.duration_seconds || 0));
    const last_position_seconds = Math.max(0, Number(req.body.last_position_seconds || 0));
    const completedThreshold = duration_seconds > 0 ? watched_seconds / duration_seconds : 0;
    const completed = req.body.completed === true || completedThreshold >= 0.9;

    const payload = {
      watched_seconds,
      duration_seconds,
      last_position_seconds,
      completed,
      updatedAt: new Date(),
    };

    if (completed) payload.completedAt = new Date();

    const progress = await LessonProgress.findOneAndUpdate(
      { user_id: req.user.id, lesson_id: lesson._id },
      { $set: payload, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    ).lean();

    res.json(progress);
  } catch (err) {
    console.error('Save lesson progress error:', err);
    res.status(500).json({ error: 'Erro ao salvar progresso da aula' });
  }
});

// Marcar aula como concluída
router.post('/:id/complete', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean();
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });

    const progress = await LessonProgress.findOneAndUpdate(
      { user_id: req.user.id, lesson_id: lesson._id },
      {
        $set: {
          watched_seconds: lesson.duration_seconds || 0,
          duration_seconds: lesson.duration_seconds || 0,
          last_position_seconds: lesson.duration_seconds || 0,
          completed: true,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true }
    ).lean();

    res.json(progress);
  } catch (err) {
    console.error('Complete lesson error:', err);
    res.status(500).json({ error: 'Erro ao concluir aula' });
  }
});

// Listar feedbacks de uma aula
router.get('/:id/feedback', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean();
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });

    const feedbacks = await LessonFeedback.find({ lesson_id: lesson._id }).sort({ updatedAt: -1 }).lean();
    const avg = feedbacks.length > 0
      ? Math.round((feedbacks.reduce((sum, item) => sum + (item.rating || 0), 0) / feedbacks.length) * 10) / 10
      : 0;

    res.json({
      average_rating: avg,
      total: feedbacks.length,
      items: feedbacks,
    });
  } catch (err) {
    console.error('List lesson feedback error:', err);
    res.status(500).json({ error: 'Erro ao listar avaliações da aula' });
  }
});

// Criar/atualizar feedback da aula
router.post('/:id/feedback', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).lean();
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });

    const rating = Number(req.body.rating || 0);
    const comment = String(req.body.comment || '').trim();
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'A nota deve estar entre 1 e 5' });
    }

    const feedback = await LessonFeedback.findOneAndUpdate(
      { user_id: req.user.id, lesson_id: lesson._id },
      {
        $set: {
          rating,
          comment,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).lean();

    res.status(201).json(feedback);
  } catch (err) {
    console.error('Save lesson feedback error:', err);
    res.status(500).json({ error: 'Erro ao salvar avaliação da aula' });
  }
});

// Criar nova aula
router.post('/', async (req, res) => {
  try {
    const lesson = new Lesson(req.body);
    await lesson.save();
    res.status(201).json(lesson);
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({ error: 'Erro ao criar aula' });
  }
});

// Atualizar aula
router.put('/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lesson) return res.status(404).json({ error: 'Aula não encontrada' });
    res.json(lesson);
  } catch (err) {
    console.error('Update lesson error:', err);
    res.status(500).json({ error: 'Erro ao atualizar aula' });
  }
});

// Deletar aula
router.delete('/:id', async (req, res) => {
  try {
    await Lesson.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete lesson error:', err);
    res.status(500).json({ error: 'Erro ao deletar aula' });
  }
});

module.exports = router;
