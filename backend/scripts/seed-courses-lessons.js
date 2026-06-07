/**
 * Seed Script: Trilhas e Aulas com URLs de Vídeo
 * Popula Collections Course e Lesson com dados reais para demo
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Course = require('../src/models/Course');
const Lesson = require('../src/models/Lesson');

// Prioridade: MONGO_URI_LOCAL > MONGODB_URI > default local
const MONGO_URI = process.env.MONGO_URI_LOCAL 
  || process.env.MONGODB_URI 
  || 'mongodb://localhost:27017/ordex';

// Carrega dados do JSON
const seedDataPath = path.join(__dirname, 'seed-data.json');
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

async function connectToDatabase() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await mongoose.connect(MONGO_URI, {
        dbName: 'ordex',
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 10000,
      });
      return true;
    } catch (err) {
      if (attempt < 3) {
        console.log(`⏳ Tentativa ${attempt} falhou, tentando novamente em 2s...`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        return false;
      }
    }
  }
}

async function seedCoursesAndLessons() {
  try {
    console.log('🌱 Iniciando seed de trilhas e aulas...');
    console.log(`📍 Tentando conectar ao MongoDB...`);
    console.log(`   URI: ${MONGO_URI.replace(/:[^@:/?]+@/, ':<password>@')}`);

    const connected = await connectToDatabase();

    if (!connected) {
      console.error('\n❌ Erro ao conectar ao MongoDB após 3 tentativas:');
      console.error('   Não foi possível conectar com a URI configurada');
      console.error('\n💡 Soluções possíveis:');
      console.error('   1. Se usar MongoDB local: inicie com "mongod"');
      console.error('   2. Se usar Atlas: verifique se seu IP está na whitelist');
      console.error('   3. Se usar Atlas: verifique conexão com internet');
      console.error('   4. Configure MONGO_URI_LOCAL no .env para usar local');
      console.error('\n💾 Arquivo de dados preparado em: scripts/seed-data.json');
      console.error('   Você pode importar manualmente usando MongoDB Compass');
      process.exit(1);
    }

    console.log('✅ Conectado ao MongoDB');

    // Clear existing data (opcional - comentar se quiser manter histórico)
    // await Course.deleteMany({});
    // await Lesson.deleteMany({});
    // console.log('🗑️ Coleções limpas');

    // Criar Courses primeiro
    const courseMap = {};
    for (const courseData of seedData.courses) {
      const course = await Course.create(courseData);
      courseMap[seedData.courses.indexOf(courseData)] = course._id;
      console.log(`✅ Trilha criada: ${course.title} (ID: ${course._id})`);
    }

    // Criar Lessons com referência aos Courses
    let lessonCount = 0;
    for (const lessonData of seedData.lessons) {
      const courseId = courseMap[lessonData.course_index];
      const lesson = await Lesson.create({
        ...lessonData,
        course_id: courseId
      });
      lessonCount++;
    }
    console.log(`✅ ${lessonCount} aulas adicionadas`);

    // Summary
    const totalCourses = await Course.countDocuments();
    const totalLessons = await Lesson.countDocuments();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEED CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📚 Total de Trilhas (Courses): ${totalCourses}`);
    console.log(`📖 Total de Aulas (Lessons): ${totalLessons}`);
    console.log('\n📍 Trilhas criadas:');
    seedData.courses.forEach((c, i) => {
      const lessonCount = seedData.lessons.filter(l => l.course_index === i).length;
      const freeLabel = c.free ? 'FREE' : 'PREMIUM';
      console.log(`   ${i+1}. ${c.title} (${lessonCount} aulas - ${freeLabel})`);
    });
    console.log('\n🎯 Próximas ações:');
    console.log('   1. Inicie o servidor backend: npm run dev');
    console.log('   2. Acesse http://localhost:3001/api/lessons');
    console.log('   3. Abra o frontend e navegue até Courses/Lessons');
    console.log('   4. Selecione uma aula e teste o player de vídeo');
    console.log('   5. Marque como concluída e veja o desbloqueio da próxima');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedCoursesAndLessons();

    // Clear existing data (optional - comentar se quiser manter histórico)
    // await Course.deleteMany({});
    // await Lesson.deleteMany({});
    // console.log('🗑️ Coleções limpas');

    // ============================================
    // TRILHA 1: Fundamentos de Alto Rendimento
    // ============================================
    const course1 = await Course.create({
      title: 'Fundamentos de Alto Rendimento',
      description: 'Aprenda técnicas essenciais para otimizar seu desempenho e alcançar excelência nos estudos.',
      free: true,
      order: 1
    });
    console.log(`✅ Trilha criada: ${course1.title} (ID: ${course1._id})`);

    const lessons1 = await Lesson.insertMany([
      {
        title: 'Introdução ao Alto Rendimento',
        description: 'Conheça os princípios fundamentais do desempenho acadêmico.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        course_id: course1._id,
        duration_seconds: 720,
        order: 1,
        tags: ['fundamentos', 'motivação', 'introdução'],
        free: true,
        published: true
      },
      {
        title: 'Gestão de Tempo e Produtividade',
        description: 'Técnicas comprovadas para gerenciar seu tempo eficientemente.',
        videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        course_id: course1._id,
        duration_seconds: 1200,
        order: 2,
        tags: ['produtividade', 'gestão-de-tempo', 'organização'],
        free: true,
        published: true
      },
      {
        title: 'Técnicas de Memorização Avançadas',
        description: 'Métodos científicos para memorizar e reter informações.',
        videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        course_id: course1._id,
        duration_seconds: 900,
        order: 3,
        tags: ['memorização', 'técnicas', 'neurociência'],
        free: false,
        published: true
      },
      {
        title: 'Foco e Concentração',
        description: 'Estratégias para manter o foco durante longas sessões de estudo.',
        videoUrl: 'https://www.youtube.com/watch?v=DLzxrzFCyOs',
        course_id: course1._id,
        duration_seconds: 1080,
        order: 4,
        tags: ['foco', 'concentração', 'mindfulness'],
        free: false,
        published: true
      }
    ]);
    console.log(`✅ ${lessons1.length} aulas adicionadas à trilha 1`);

    // ============================================
    // TRILHA 2: Sprint de Questões e Simulados
    // ============================================
    const course2 = await Course.create({
      title: 'Sprint de Questões e Simulados',
      description: 'Prepare-se intensivamente com questões estratégicas e simulados completos.',
      free: false,
      order: 2
    });
    console.log(`✅ Trilha criada: ${course2.title} (ID: ${course2._id})`);

    const lessons2 = await Lesson.insertMany([
      {
        title: 'Como Resolver Questões Estrategicamente',
        description: 'Aprenda a abordar questões de forma estruturada.',
        videoUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0',
        course_id: course2._id,
        duration_seconds: 1200,
        order: 1,
        tags: ['questões', 'estratégia', 'resolução'],
        free: true,
        published: true
      },
      {
        title: 'Análise de Erros em Simulados',
        description: 'Técnica para extrair máximo aprendizado de seus erros.',
        videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        course_id: course2._id,
        duration_seconds: 900,
        order: 2,
        tags: ['simulados', 'análise-de-erros', 'feedback'],
        free: true,
        published: true
      },
      {
        title: 'Sprint de 100 Questões',
        description: 'Resolva 100 questões de forma intensiva com cronômetro.',
        videoUrl: 'https://www.youtube.com/watch?v=ZZ5qpXbvcci',
        course_id: course2._id,
        duration_seconds: 3600,
        order: 3,
        tags: ['sprint', 'desafio', 'questões'],
        free: false,
        published: true
      },
      {
        title: 'Simulado Completo - Modo Exame',
        description: 'Simulado com todas as áreas: 4h de prova.',
        videoUrl: 'https://www.youtube.com/watch?v=8fnfeuQnKEI',
        course_id: course2._id,
        duration_seconds: 14400,
        order: 4,
        tags: ['simulado', 'exame', 'completo'],
        free: false,
        published: true
      },
      {
        title: 'Revisão de Gabarito e Resolução',
        description: 'Resolução comentada de todas as questões do simulado.',
        videoUrl: 'https://www.youtube.com/watch?v=kfvxMQd4f9I',
        course_id: course2._id,
        duration_seconds: 7200,
        order: 5,
        tags: ['gabarito', 'resolução', 'comentada'],
        free: false,
        published: true
      }
    ]);
    console.log(`✅ ${lessons2.length} aulas adicionadas à trilha 2`);

    // ============================================
    // TRILHA 3: Revisão Estratégica Final
    // ============================================
    const course3 = await Course.create({
      title: 'Revisão Estratégica Final',
      description: 'Consolidação de conhecimento e últimos preparativos antes da prova.',
      free: false,
      order: 3
    });
    console.log(`✅ Trilha criada: ${course3.title} (ID: ${course3._id})`);

    const lessons3 = await Lesson.insertMany([
      {
        title: 'Roteiro de Revisão Eficiente',
        description: 'Plano estruturado para revisar todo o conteúdo.',
        videoUrl: 'https://www.youtube.com/watch?v=C0DPdy98e4c',
        course_id: course3._id,
        duration_seconds: 1200,
        order: 1,
        tags: ['revisão', 'planejamento', 'eficiência'],
        free: true,
        published: true
      },
      {
        title: 'Revisão de Conceitos Críticos',
        description: 'Foco nos conceitos mais importantes e frequentes.',
        videoUrl: 'https://www.youtube.com/watch?v=9T1vfsj0-5Y',
        course_id: course3._id,
        duration_seconds: 2400,
        order: 2,
        tags: ['conceitos', 'crítico', 'foco'],
        free: true,
        published: true
      },
      {
        title: 'Questões que Mais Caem',
        description: 'Análise das questões recorrentes em provas anteriores.',
        videoUrl: 'https://www.youtube.com/watch?v=5dKazAjNwsk',
        course_id: course3._id,
        duration_seconds: 1800,
        order: 3,
        tags: ['questões', 'recorrentes', 'padrão'],
        free: false,
        published: true
      },
      {
        title: 'Mentoria Final - Psicologia da Prova',
        description: 'Preparação mental e estratégias para o dia da prova.',
        videoUrl: 'https://www.youtube.com/watch?v=V-aUjScWrv0',
        course_id: course3._id,
        duration_seconds: 1500,
        order: 4,
        tags: ['mentoria', 'psicologia', 'prova'],
        free: false,
        published: true
      }
    ]);
    console.log(`✅ ${lessons3.length} aulas adicionadas à trilha 3`);

    // ============================================
    // TRILHA 4: Aprofundamento por Assunto
    // ============================================
    const course4 = await Course.create({
      title: 'Aprofundamento por Assunto',
      description: 'Módulos especializados para dominar tópicos específicos.',
      free: false,
      order: 4
    });
    console.log(`✅ Trilha criada: ${course4.title} (ID: ${course4._id})`);

    const lessons4 = await Lesson.insertMany([
      {
        title: 'Tópico 1 - Conceitos Fundamentais',
        description: 'Base essencial para o primeiro tópico.',
        videoUrl: 'https://www.youtube.com/watch?v=Dff4fww0ufk',
        course_id: course4._id,
        duration_seconds: 1800,
        order: 1,
        tags: ['aprofundamento', 'tópico-1', 'fundamentos'],
        free: false,
        published: true
      },
      {
        title: 'Tópico 1 - Aplicações Práticas',
        description: 'Exercícios e aplicações do tópico 1.',
        videoUrl: 'https://www.youtube.com/watch?v=rJukFMvjjJo',
        course_id: course4._id,
        duration_seconds: 1500,
        order: 2,
        tags: ['aprofundamento', 'tópico-1', 'prática'],
        free: false,
        published: true
      },
      {
        title: 'Tópico 2 - Conceitos Fundamentais',
        description: 'Base essencial para o segundo tópico.',
        videoUrl: 'https://www.youtube.com/watch?v=5KLPxDtMqe8',
        course_id: course4._id,
        duration_seconds: 2100,
        order: 3,
        tags: ['aprofundamento', 'tópico-2', 'fundamentos'],
        free: false,
        published: true
      },
      {
        title: 'Tópico 2 - Questões Desafiadoras',
        description: 'Questões de alta dificuldade do tópico 2.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        course_id: course4._id,
        duration_seconds: 1800,
        order: 4,
        tags: ['aprofundamento', 'tópico-2', 'desafio'],
        free: false,
        published: true
      }
    ]);
    console.log(`✅ ${lessons4.length} aulas adicionadas à trilha 4`);

    // ============================================
    // SUMMARY
    // ============================================
    const totalCourses = await Course.countDocuments();
    const totalLessons = await Lesson.countDocuments();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEED CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📚 Total de Trilhas (Courses): ${totalCourses}`);
    console.log(`📖 Total de Aulas (Lessons): ${totalLessons}`);
    console.log('\n📍 Trilhas criadas:');
    console.log(`   1. ${course1.title} (${lessons1.length} aulas - FREE)`);
    console.log(`   2. ${course2.title} (${lessons2.length} aulas - PREMIUM)`);
    console.log(`   3. ${course3.title} (${lessons3.length} aulas - PREMIUM)`);
    console.log(`   4. ${course4.title} (${lessons4.length} aulas - PREMIUM)`);
    console.log('\n🎯 Próximas ações:');
    console.log('   1. Inicie o servidor backend: npm run dev');
    console.log('   2. Acesse http://localhost:5000/api/lessons');
    console.log('   3. Abra o frontend e navegue até Courses/Lessons');
    console.log('   4. Selecione uma aula e teste o player de vídeo');
    console.log('   5. Marque como concluída e veja o desbloqueio da próxima');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seedCoursesAndLessons();
