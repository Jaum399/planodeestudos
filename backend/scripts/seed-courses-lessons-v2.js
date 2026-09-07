/**
 * Seed Script: Trilhas e Aulas com URLs de Vídeo (v2)
 * Popula Collections Course e Lesson com dados reais para demo
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

[
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env.prod.current'),
  path.join(__dirname, '../../.env.prod.after'),
  path.join(__dirname, '../../.env'),
].forEach((envPath) => {
  require('dotenv').config({ path: envPath, override: false });
});

function enablePublicDnsResolver() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const originalLookup = dns.lookup.bind(dns);
  dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || !addresses.length) {
        return originalLookup(hostname, options, callback);
      }

      if (options && options.all) {
        return callback(null, addresses.map((address) => ({ address, family: 4 })));
      }

      return callback(null, addresses[0], 4);
    });
  };
}

if (String(process.env.FORCE_PUBLIC_DNS || '').toLowerCase() === 'true' || process.env.FORCE_PUBLIC_DNS === '1') {
  enablePublicDnsResolver();
  console.log('🌐 DNS público forçado (8.8.8.8/1.1.1.1)');
}

// Import models
const Course = require('../src/models/Course');
const Lesson = require('../src/models/Lesson');

// Prioridade: MONGO_URI_LOCAL > MONGODB_URI > default local
const MONGO_URI = process.env.MONGO_URI_LOCAL 
  || process.env.MONGODB_URI 
  || process.env.appplanodeestudosvercelapp_MONGODB_URI
  || process.env.appordexvercelapp_MONGODB_URI
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
