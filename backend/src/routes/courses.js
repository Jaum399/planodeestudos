const express = require('express');
const { randomUUID } = require('crypto');
const { getDatabase } = require('../database');
const { authenticate, requireAccess } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAccess);

// ── GET /api/courses - List all courses with filters ────────────────────────
router.get('/', async (req, res) => {
  try {
    const { courses } = getDatabase();
    const { category, specialization, search, limit = 20 } = req.query;

    const filters = { visibility: 'published', status: 'active' };
    if (category) filters.category = category;
    if (specialization) filters.specialization = specialization;

    let query = courses.find(filters).sort({ created_at: -1 }).limit(parseInt(limit));

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = courses.find({
        ...filters,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
        ],
      }).sort({ created_at: -1 }).limit(parseInt(limit));
    }

    const courseList = await query.toArray();
    res.json({ courses: courseList });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Erro ao listar cursos' });
  }
});

// ── GET /api/courses/:id - Get course details with chapters and lessons ────
router.get('/:id', async (req, res) => {
  try {
    const { courses, chapters, lessons } = getDatabase();
    const courseId = req.params.id;

    const course = await courses.findOne({ _id: courseId });
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    const courseChapters = await chapters.find({ course_id: courseId }).sort({ order: 1 }).toArray();

    const chaptersWithLessons = await Promise.all(
      courseChapters.map(async (chapter) => {
        const chapterLessons = await lessons
          .find({ chapter_id: chapter._id })
          .sort({ order: 1 })
          .toArray();
        return { ...chapter, lessons: chapterLessons };
      })
    );

    res.json({
      course,
      chapters: chaptersWithLessons,
    });
  } catch (error) {
    console.error('Get course detail error:', error);
    res.status(500).json({ error: 'Erro ao buscar curso' });
  }
});

// ── GET /api/courses/:id/progress - Get user's progress in course ──────────
router.get('/:id/progress', async (req, res) => {
  try {
    const { courseProgress } = getDatabase();
    const { id } = req.params;

    const progress = await courseProgress.findOne({
      user_id: req.user.id,
      course_id: id,
    });

    res.json({
      progress: progress || {
        user_id: req.user.id,
        course_id: id,
        status: 'not_started',
        progress_percent: 0,
        lessons_completed: 0,
        total_lessons: 0,
      },
    });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// ── POST /api/courses/:id/enroll - Enroll user in course ────────────────────
router.post('/:id/enroll', async (req, res) => {
  try {
    const { id } = req.params;
    const { courseProgress, courses, lessons } = getDatabase();
    const now = new Date().toISOString();

    // Check if already enrolled
    const existing = await courseProgress.findOne({
      user_id: req.user.id,
      course_id: id,
    });

    if (existing) {
      return res.json({ progress: existing, alreadyEnrolled: true });
    }

    // Get total lessons count
    const totalLessons = await lessons.countDocuments({ course_id: id });

    // Create progress record
    const progress = {
      _id: `${req.user.id}_${id}_${Date.now()}`,
      user_id: req.user.id,
      course_id: id,
      status: 'in_progress',
      enrollment_date: now,
      completion_date: null,
      last_accessed_at: now,
      progress_percent: 0,
      lessons_completed: 0,
      total_lessons: totalLessons,
    };

    await courseProgress.insertOne(progress);

    // Increment enrollment count
    await courses.updateOne({ _id: id }, { $inc: { enrollment_count: 1 } });

    res.json({ progress, message: 'Inscrição realizada com sucesso!' });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Erro ao se inscrever no curso' });
  }
});

// ── GET /api/courses/:courseId/lessons/:lessonId - Get lesson details ──────
router.get('/:courseId/lessons/:lessonId', async (req, res) => {
  try {
    const { lessons } = getDatabase();
    const { lessonId } = req.params;

    const lesson = await lessons.findOne({ _id: lessonId });
    if (!lesson) {
      return res.status(404).json({ error: 'Aula não encontrada' });
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Erro ao buscar aula' });
  }
});

// ── POST /api/lessons/:id/progress - Mark lesson as completed ──────────────
router.post('/lesson/:id/progress', async (req, res) => {
  try {
    const { id: lessonId } = req.params;
    const { lessons, lessonProgress, courseProgress, courses } = getDatabase();
    const now = new Date().toISOString();

    // Get lesson to find course/chapter
    const lesson = await lessons.findOne({ _id: lessonId });
    if (!lesson) {
      return res.status(404).json({ error: 'Aula não encontrada' });
    }

    // Check if already completed
    const existing = await lessonProgress.findOne({
      user_id: req.user.id,
      lesson_id: lessonId,
    });

    // Create or update lesson progress
    if (existing && existing.is_completed) {
      return res.json({ progress: existing, alreadyCompleted: true });
    }

    const progressId = existing ? existing._id : `${req.user.id}_${lessonId}_${Date.now()}`;

    const lessonProgressData = {
      _id: progressId,
      user_id: req.user.id,
      lesson_id: lessonId,
      course_id: lesson.course_id,
      started_at: existing?.started_at || now,
      completed_at: now,
      time_spent_minutes: (existing?.time_spent_minutes || 0) + 5, // rough estimate
      is_completed: true,
      notes: existing?.notes || '',
    };

    if (existing) {
      await lessonProgress.updateOne({ _id: progressId }, { $set: lessonProgressData });
    } else {
      await lessonProgress.insertOne(lessonProgressData);
    }

    // Update course progress
    const courseProgressData = await courseProgress.findOne({
      user_id: req.user.id,
      course_id: lesson.course_id,
    });

    if (courseProgressData) {
      const lessonsCompleted = !existing || !existing.is_completed
        ? courseProgressData.lessons_completed + 1
        : courseProgressData.lessons_completed;

      const progressPercent = Math.round(
        (lessonsCompleted / courseProgressData.total_lessons) * 100
      );

      const updateData = {
        lessons_completed: lessonsCompleted,
        progress_percent: progressPercent,
        last_accessed_at: now,
      };

      // Check if course is completed
      if (lessonsCompleted >= courseProgressData.total_lessons) {
        updateData.status = 'completed';
        updateData.completion_date = now;

        // Generate certificate when course completes
        await generateCertificate(req.user.id, lesson.course_id, now);
      }

      await courseProgress.updateOne(
        { _id: courseProgressData._id },
        { $set: updateData }
      );
    }

    res.json({
      progress: lessonProgressData,
      message: 'Aula marcada como completa!',
    });
  } catch (error) {
    console.error('Mark lesson complete error:', error);
    res.status(500).json({ error: 'Erro ao marcar aula como completa' });
  }
});

// ── Admin: POST /api/courses - Create course ──────────────────────────────
router.post('/', async (req, res) => {
  try {
    // TODO: Add admin role check
    const { title, description, specialization, category, total_hours, difficulty } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Título do curso é obrigatório' });
    }

    const { courses } = getDatabase();
    const now = new Date().toISOString();

    const course = {
      _id: randomUUID(),
      title,
      description: description || '',
      specialization: specialization || 'genérico',
      category: category || 'intermediário',
      author_id: req.user.id,
      visibility: 'draft',
      total_hours: total_hours || 0,
      difficulty: difficulty || 5,
      enrollment_count: 0,
      rating: 0,
      rating_count: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    await courses.insertOne(course);
    res.status(201).json({ course, message: 'Curso criado com sucesso!' });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Erro ao criar curso' });
  }
});

// ── Admin: POST /api/courses/:id/chapters - Create chapter ────────────────
router.post('/:id/chapters', async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const { title, description, estimated_hours } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Título do capítulo é obrigatório' });
    }

    const { chapters } = getDatabase();
    const now = new Date().toISOString();

    // Get order for new chapter
    const lastChapter = await chapters
      .find({ course_id: courseId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();

    const order = lastChapter.length > 0 ? lastChapter[0].order + 1 : 1;

    const chapter = {
      _id: randomUUID(),
      course_id: courseId,
      title,
      order,
      description: description || '',
      estimated_hours: estimated_hours || 0,
      lessons_count: 0,
      created_at: now,
      updated_at: now,
    };

    await chapters.insertOne(chapter);
    res.status(201).json({ chapter, message: 'Capítulo criado com sucesso!' });
  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ error: 'Erro ao criar capítulo' });
  }
});

// ── Admin: POST /api/courses/:id/chapters/:chId/lessons - Create lesson ───
router.post('/:id/chapters/:chId/lessons', async (req, res) => {
  try {
    const { id: courseId, chId: chapterId } = req.params;
    const { title, type, content, learning_objectives, estimated_minutes } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Título da aula é obrigatório' });
    }

    const { lessons } = getDatabase();
    const now = new Date().toISOString();

    // Get order for new lesson
    const lastLesson = await lessons
      .find({ chapter_id: chapterId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();

    const order = lastLesson.length > 0 ? lastLesson[0].order + 1 : 1;

    const lesson = {
      _id: randomUUID(),
      course_id: courseId,
      chapter_id: chapterId,
      title,
      order,
      type: type || 'text',
      content: content || {},
      learning_objectives: learning_objectives || [],
      estimated_minutes: estimated_minutes || 0,
      difficulty: 5,
      tags: [],
      attachments: [],
      created_at: now,
      updated_at: now,
    };

    await lessons.insertOne(lesson);

    // Update chapter lessons_count
    await getDatabase().chapters.updateOne(
      { _id: chapterId },
      { $inc: { lessons_count: 1 } }
    );

    res.status(201).json({ lesson, message: 'Aula criada com sucesso!' });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Erro ao criar aula' });
  }
});

// ── Helper: Generate Certificate ──────────────────────────────────────────
async function generateCertificate(userId, courseId, issuedAt) {
  try {
    const { certificates, users, courses } = getDatabase();

    const user = await users.findOne({ _id: userId });
    const course = await courses.findOne({ _id: courseId });

    if (!user || !course) return;

    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const now = new Date().toISOString();

    const certificate = {
      _id: randomUUID(),
      user_id: userId,
      course_id: courseId,
      issue_date: issuedAt,
      certificate_number: certificateNumber,
      pdf_url: '', // Will be generated on-demand
      status: 'valid',
      created_at: now,
    };

    await certificates.insertOne(certificate);
    return certificate;
  } catch (error) {
    console.error('Generate certificate error:', error);
  }
}

module.exports = router;
