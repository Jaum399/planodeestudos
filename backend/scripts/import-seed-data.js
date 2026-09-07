/**
 * Importador de Seed Data - Script para importar trilhas e aulas
 * Use este script quando tiver conectividade com MongoDB
 * 
 * Uso:
 *   node scripts/import-seed-data.js
 *   MONGO_URI=mongodb://localhost:27017/ordex node scripts/import-seed-data.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Carrega variáveis de ambiente
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

// Importa models
const Course = require('../src/models/Course');
const Lesson = require('../src/models/Lesson');

// URI com prioridade
const MONGO_URI = process.env.MONGO_URI_LOCAL 
  || process.env.MONGODB_URI 
  || process.env.appplanodeestudosvercelapp_MONGODB_URI
  || process.env.appordexvercelapp_MONGODB_URI
  || 'mongodb://localhost:27017/ordex';

const seedDataPath = path.join(__dirname, 'seed-data.json');

async function importSeedData() {
  try {
    console.log('\n📥 IMPORTADOR DE SEED DATA');
    console.log('='.repeat(60));
    
    if (!fs.existsSync(seedDataPath)) {
      throw new Error(`Arquivo não encontrado: ${seedDataPath}`);
    }

    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    console.log('✅ Arquivo seed-data.json carregado');
    console.log(`   - ${seedData.courses.length} trilhas`);
    console.log(`   - ${seedData.lessons.length} aulas`);

    console.log('\n🔗 Conectando ao MongoDB...');
    console.log(`   URI: ${MONGO_URI.replace(/:[^@:/?]+@/, ':<password>@')}`);

    await mongoose.connect(MONGO_URI, {
      dbName: 'ordex',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Conectado ao MongoDB!');

    // Verificar se já existem dados
    const existingCourses = await Course.countDocuments();
    const existingLessons = await Lesson.countDocuments();
    
    if (existingCourses > 0 || existingLessons > 0) {
      console.log('\n⚠️  Aviso: Dados já existem no banco');
      console.log(`   - Courses: ${existingCourses}`);
      console.log(`   - Lessons: ${existingLessons}`);
      console.log('\n💡 Para limpar e reiniciar, execute:');
      console.log('   db.courses.deleteMany({})');
      console.log('   db.lessons.deleteMany({})');
      console.log('\n❓ Deseja continuar mesmo assim? (Pode causar duplicatas)');
      console.log('   Se não: pressione Ctrl+C agora');
      console.log('   Se sim: o script prosseguirá em 5 segundos...\n');
      await new Promise(r => setTimeout(r, 5000));
    }

    // Importar Courses
    console.log('\n📚 Importando trilhas...');
    const courseMap = {};
    for (let i = 0; i < seedData.courses.length; i++) {
      const courseData = seedData.courses[i];
      const course = await Course.create(courseData);
      courseMap[i] = course._id;
      console.log(`   ✅ ${course.title}`);
    }

    // Importar Lessons
    console.log('\n📖 Importando aulas...');
    let lessonCounter = 0;
    for (const lessonData of seedData.lessons) {
      const courseId = courseMap[lessonData.course_index];
      const lesson = await Lesson.create({
        ...lessonData,
        course_id: courseId
      });
      lessonCounter++;
      if (lessonCounter % 3 === 0) {
        process.stdout.write('.');
      }
    }
    console.log(`\n   ✅ ${lessonCounter} aulas importadas`);

    // Summary
    const totalCourses = await Course.countDocuments();
    const totalLessons = await Lesson.countDocuments();

    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📊 Status do banco:`);
    console.log(`   - Total de trilhas: ${totalCourses}`);
    console.log(`   - Total de aulas: ${totalLessons}`);

    console.log('\n🧪 Teste rápido:');
    console.log('   GET http://localhost:3001/api/lessons');
    console.log('   GET http://localhost:3001/api/lessons/courses/roadmap');

    console.log('\n🎓 Próximos passos:');
    console.log('   1. Inicie o backend: npm run dev');
    console.log('   2. Abra o frontend');
    console.log('   3. Navegue até Aulas ou Cursos');
    console.log('   4. Selecione uma aula e teste o player de vídeo');

    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro na importação:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Impossível conectar ao MongoDB');
      console.error('   Se usar local: inicie com "mongod"');
      console.error('   Se usar Atlas: verifique conectividade e whitelist de IP');
    }
    console.error('\n' + error.stack);
    process.exit(1);
  }
}

// Executar
importSeedData();
