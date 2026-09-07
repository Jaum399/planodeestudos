const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'appmentoria';

const courseData = {
  title: 'Farmacologia Básica',
  description: 'Introdução completa aos princípios fundamentais da Farmacologia, incluindo farmacocinética, farmacodinâmica e aplicações clínicas.',
  specialization: 'medicina',
  category: 'intermediário',
  author_id: 'admin-seed',
  visibility: 'published',
  thumbnail: '',
  rating: 4.5,
  enrollment_count: 127,
  prerequisite_courses: [],
  total_hours: 12,
  difficulty: 5,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const chaptersData = [
  {
    title: 'Introdução à Farmacologia',
    order: 1,
    description: 'Conceitos básicos e histórico da farmacologia',
    estimated_hours: 2,
    lessons_count: 3,
  },
  {
    title: 'Farmacocinética',
    order: 2,
    description: 'Absorção, distribuição, metabolismo e excreção de fármacos',
    estimated_hours: 3,
    lessons_count: 4,
  },
  {
    title: 'Farmacodinâmica',
    order: 3,
    description: 'Mecanismos de ação dos fármacos e efeitos biológicos',
    estimated_hours: 3,
    lessons_count: 3,
  },
  {
    title: 'Aplicações Clínicas',
    order: 4,
    description: 'Uso clínico de fármacos em diferentes condições',
    estimated_hours: 2,
    lessons_count: 2,
  },
  {
    title: 'Reações Adversas e Interações',
    order: 5,
    description: 'Efeitos colaterais e interações medicamentosas',
    estimated_hours: 2,
    lessons_count: 2,
  },
];

const lessonsPerChapter = [
  [
    { title: 'O que é Farmacologia', estimated_minutes: 15 },
    { title: 'História e Evolução', estimated_minutes: 20 },
    { title: 'Conceitos Fundamentais', estimated_minutes: 25 },
  ],
  [
    { title: 'Absorção de Fármacos', estimated_minutes: 20 },
    { title: 'Distribuição e Biodisponibilidade', estimated_minutes: 25 },
    { title: 'Metabolismo Hepático', estimated_minutes: 20 },
    { title: 'Excreção Renal', estimated_minutes: 15 },
  ],
  [
    { title: 'Receptores Farmacológicos', estimated_minutes: 25 },
    { title: 'Dose-Resposta', estimated_minutes: 20 },
    { title: 'Seletividade e Especificidade', estimated_minutes: 15 },
  ],
  [
    { title: 'Antibióticos', estimated_minutes: 20 },
    { title: 'Analgésicos e Anti-inflamatórios', estimated_minutes: 25 },
  ],
  [
    { title: 'Reações Adversas Comuns', estimated_minutes: 20 },
    { title: 'Interações Medicamentosas', estimated_minutes: 25 },
  ],
];

async function seedCourses() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);

    console.log('🌱 Iniciando seed de cursos...');

    // Create course
    const courseId = randomUUID();
    const courseWithId = { _id: courseId, ...courseData };

    await db.collection('courses').insertOne(courseWithId);
    console.log('✓ Curso criado:', courseWithId.title);

    // Create chapters with lessons
    for (let i = 0; i < chaptersData.length; i++) {
      const chapterId = randomUUID();
      const chapter = {
        _id: chapterId,
        course_id: courseId,
        ...chaptersData[i],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.collection('chapters').insertOne(chapter);
      console.log(`✓ Capítulo ${chapter.order} criado: ${chapter.title}`);

      // Create lessons for this chapter
      const lessons = lessonsPerChapter[i];
      for (let j = 0; j < lessons.length; j++) {
        const lessonId = randomUUID();
        const lesson = {
          _id: lessonId,
          course_id: courseId,
          chapter_id: chapterId,
          order: j + 1,
          type: 'text',
          content: {
            text_markdown: `<h2>${lessons[j].title}</h2><p>Conteúdo da aula em desenvolvimento...</p>`,
          },
          learning_objectives: [
            `Entender ${lessons[j].title.toLowerCase()}`,
            'Aplicar conceitos práticos',
          ],
          difficulty: 5,
          tags: ['farmacologia', 'medicina'],
          attachments: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...lessons[j],
        };

        await db.collection('lessons').insertOne(lesson);
        console.log(`  - Aula ${lesson.order}: ${lesson.title}`);
      }
    }

    console.log('\n✅ Seed completado com sucesso!');
    console.log(`\nCurso ID para testes: ${courseId}`);
    console.log('Acesse: http://localhost:5173/app/courses/' + courseId);
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
  } finally {
    await client.close();
  }
}

seedCourses();
