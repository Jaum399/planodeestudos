const path = require('path');
const dotenv = require('dotenv');

[
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
].forEach((envPath) => {
  dotenv.config({ path: envPath, override: false });
});

const mongoose = require('mongoose');
const { initializeDatabase, getDatabase } = require('../src/database');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const [rawKey, inlineValue] = token.slice(2).split('=');
    const key = rawKey.trim();

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function printUsage() {
  console.log('Uso:');
  console.log('  node scripts/migrate-user-data.js --from-user-id <id> --to-user-id <id> [--dry-run]');
  console.log('  node scripts/migrate-user-data.js --from-email <email> --to-email <email> [--dry-run]');
  console.log('Flags:');
  console.log('  --dry-run              Mostra o que será migrado sem gravar alterações');
  console.log('  --copy-profile         Copia campos de perfil do usuário origem para destino');
  console.log('  --overwrite-singletons Sobrescreve dados de Jarvis/Mindmap no destino (padrão: true)');
  console.log('  --keep-singletons      Não sobrescreve Jarvis/Mindmap no destino quando já existir');
}

function toPlain(doc) {
  if (!doc) return null;
  return doc.toObject ? doc.toObject() : { ...doc };
}

async function resolveUser(users, params, sideName) {
  if (params.userId) {
    const byId = await users.findOne({ _id: String(params.userId).trim() });
    if (byId) return byId;
    throw new Error(`Usuário ${sideName} não encontrado por id: ${params.userId}`);
  }

  if (params.email) {
    const byEmail = await users.findOne({ email: String(params.email).trim().toLowerCase() });
    if (byEmail) return byEmail;
    throw new Error(`Usuário ${sideName} não encontrado por email: ${params.email}`);
  }

  throw new Error(`Informe --${sideName === 'origem' ? 'from-user-id/--from-email' : 'to-user-id/--to-email'}`);
}

async function migrateCollectionOwnership({ model, collectionName, sourceId, targetId, dryRun }) {
  const docs = await model.find({ user_id: sourceId });
  const total = docs.length;

  if (dryRun || total === 0) {
    return { collectionName, moved: total };
  }

  for (const originalDoc of docs) {
    const doc = toPlain(originalDoc);
    doc.user_id = targetId;
    delete doc.__v;

    await model.findOneAndUpdate(
      { _id: doc._id },
      { $set: doc },
      { upsert: true, new: true }
    );
  }

  return { collectionName, moved: total };
}

async function migrateSingletonByUserId({ model, collectionName, sourceId, targetId, dryRun, overwrite }) {
  const sourceDocRaw = await model.findOne({ _id: sourceId });
  if (!sourceDocRaw) return { collectionName, moved: 0, detail: 'sem dados na origem' };

  const targetDocRaw = await model.findOne({ _id: targetId });
  if (!overwrite && targetDocRaw) {
    return { collectionName, moved: 0, detail: 'destino já possui dados (preservado)' };
  }

  if (dryRun) {
    return { collectionName, moved: 1, detail: targetDocRaw ? 'vai sobrescrever destino' : 'vai criar destino' };
  }

  const payload = toPlain(sourceDocRaw);
  payload._id = targetId;
  delete payload.__v;

  await model.findOneAndUpdate(
    { _id: targetId },
    { $set: payload },
    { upsert: true, new: true }
  );

  await model.deleteOne({ _id: sourceId });

  return { collectionName, moved: 1, detail: targetDocRaw ? 'sobrescrito no destino' : 'criado no destino' };
}

async function copyProfileFields({ users, sourceUser, targetUser, dryRun }) {
  const source = toPlain(sourceUser);
  const target = toPlain(targetUser);

  const fieldsToCopy = [
    'name',
    'whatsapp',
    'plan',
    'area',
    'goal',
    'weekly_goal_hours',
    'billingDocument',
    'stripeCustomerId',
    'stripeSubscriptionId',
    'asaasCustomerId',
    'asaasPaymentId',
    'asaasPaymentStatus',
    'pending_plan_type',
    'subscriptionStatus',
    'trial_started_at',
    'trial_ends_at',
    'grace_period_ends_at',
  ];

  const next = { ...target };
  for (const field of fieldsToCopy) {
    next[field] = source[field] !== undefined ? source[field] : next[field];
  }

  delete next.__v;

  if (dryRun) {
    return { copiedFields: fieldsToCopy.length };
  }

  await users.findOneAndUpdate(
    { _id: target._id },
    { $set: next },
    { new: true }
  );

  return { copiedFields: fieldsToCopy.length };
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || args.h) {
    printUsage();
    return;
  }

  const dryRun = Boolean(args['dry-run']);
  const copyProfile = Boolean(args['copy-profile']);
  const overwriteSingletons = args['keep-singletons'] ? false : true;

  await initializeDatabase();
  const db = getDatabase();

  const sourceUser = await resolveUser(db.users, {
    userId: args['from-user-id'],
    email: args['from-email'],
  }, 'origem');

  const targetUser = await resolveUser(db.users, {
    userId: args['to-user-id'],
    email: args['to-email'],
  }, 'destino');

  const source = toPlain(sourceUser);
  const target = toPlain(targetUser);

  if (String(source._id) === String(target._id)) {
    throw new Error('Origem e destino não podem ser o mesmo usuário.');
  }

  console.log('--- Migração de dados por usuário ---');
  console.log(`Origem : ${source.name} <${source.email}> (${source._id})`);
  console.log(`Destino: ${target.name} <${target.email}> (${target._id})`);
  console.log(`Modo   : ${dryRun ? 'DRY-RUN (sem escrita)' : 'EXECUÇÃO REAL'}`);

  const ownershipCollections = [
    { name: 'flashcardDecks', model: db.flashcardDecks },
    { name: 'flashcards', model: db.flashcards },
    { name: 'planner', model: db.planner },
    { name: 'schedule', model: db.schedule },
    { name: 'sessions', model: db.sessions },
    { name: 'questionAttempts', model: db.questionAttempts },
    { name: 'mockExamResults', model: db.mockExamResults },
    { name: 'studySummaries', model: db.studySummaries },
    { name: 'mnemonics', model: db.mnemonics },
    { name: 'notificationJobs', model: db.notificationJobs },
    { name: 'deadlineReminders', model: db.deadlineReminders },
    { name: 'pdfFolders', model: db.pdfFolders },
    { name: 'pdfDocuments', model: db.pdfDocuments },
    { name: 'pdfChunks', model: db.pdfChunks },
  ];

  const singletonCollections = [
    { name: 'jarvis', model: db.jarvis },
    { name: 'mindmaps', model: db.mindmaps },
  ];

  const results = [];

  for (const item of ownershipCollections) {
    const result = await migrateCollectionOwnership({
      model: item.model,
      collectionName: item.name,
      sourceId: source._id,
      targetId: target._id,
      dryRun,
    });
    results.push(result);
  }

  for (const item of singletonCollections) {
    const result = await migrateSingletonByUserId({
      model: item.model,
      collectionName: item.name,
      sourceId: source._id,
      targetId: target._id,
      dryRun,
      overwrite: overwriteSingletons,
    });
    results.push(result);
  }

  let profileResult = null;
  if (copyProfile) {
    profileResult = await copyProfileFields({
      users: db.users,
      sourceUser,
      targetUser,
      dryRun,
    });
  }

  console.log('');
  console.log('Resumo:');
  let totalMoved = 0;
  for (const item of results) {
    totalMoved += Number(item.moved || 0);
    const extra = item.detail ? ` (${item.detail})` : '';
    console.log(`- ${item.collectionName}: ${item.moved}${extra}`);
  }

  if (profileResult) {
    console.log(`- profile_fields: ${profileResult.copiedFields}`);
  }

  console.log(`Total de registros impactados: ${totalMoved}`);

  if (dryRun) {
    console.log('');
    console.log('Dry-run concluído. Execute sem --dry-run para aplicar.');
  }
}

main()
  .catch((error) => {
    console.error('Falha na migração:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
    } catch (_err) {
      // no-op
    }
  });
