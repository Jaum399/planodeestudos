// Reset remoto: conecta via URI direta (sem SRV, contorna bug DNS local)
// e apaga todas as coleções do banco 'mentoria'
const mongoose = require('mongoose');

const DIRECT_URI = 'mongodb://jmsfagundes_db_user:iH9k2D9Xi6dkV0rq@ac-ndqtoxt-shard-00-00.vya09ut.mongodb.net:27017,ac-ndqtoxt-shard-00-01.vya09ut.mongodb.net:27017,ac-ndqtoxt-shard-00-02.vya09ut.mongodb.net:27017/?authSource=admin&replicaSet=atlas-k4o47p-shard-0&ssl=true&retryWrites=true&w=majority&appName=planodeestudos';

(async () => {
  console.log('Conectando ao Atlas via URI direta...');
  try {
    await mongoose.connect(DIRECT_URI, {
      dbName: 'mentoria',
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    console.log('✅ Conectado! Host:', mongoose.connection.host);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Coleções encontradas:', collections.map(c => c.name).join(', ') || '(nenhuma)');

    // Apaga todas as coleções (reset total)
    for (const col of collections) {
      await db.collection(col.name).drop();
      console.log('  → Apagada:', col.name);
    }

    console.log('\n✅ Banco remoto "mentoria" resetado com sucesso!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
