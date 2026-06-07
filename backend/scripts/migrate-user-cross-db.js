const mongoose = require('mongoose');

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
  console.log('  node scripts/migrate-user-cross-db.js --from-uri <mongo_uri_medsimple> --to-uri <mongo_uri_appmentoria> --from-email <email> --to-email <email> [--dry-run] [--copy-profile]');
  console.log('Flags:');
  console.log('  --dry-run       Simula sem gravar');
  console.log('  --copy-profile  Copia campos de perfil/plano para o usuario destino');
}

function requireArg(args, name) {
  const value = String(args[name] || '').trim();
  if (!value) {
    throw new Error(`Argumento obrigatorio ausente: --${name}`);
  }
  return value;
}

async function findUser(usersCol, email) {
  const lower = String(email).trim().toLowerCase();
  return usersCol.findOne({ email: lower });
}

async function upsertManyDocs({ sourceCol, targetCol, sourceUserId, targetUserId, dryRun }) {
  const docs = await sourceCol.find({ user_id: sourceUserId }).toArray();
  if (dryRun || docs.length === 0) {
    return { moved: docs.length };
  }

  for (const doc of docs) {
    const next = { ...doc, user_id: targetUserId };
    await targetCol.updateOne(
      { _id: next._id },
      { $set: next },
      { upsert: true }
    );
  }

  return { moved: docs.length };
}

async function upsertSingletonByUserId({ sourceCol, targetCol, sourceUserId, targetUserId, dryRun }) {
  const sourceDoc = await sourceCol.findOne({ _id: sourceUserId });
  if (!sourceDoc) return { moved: 0, detail: 'sem dados na origem' };

  if (dryRun) return { moved: 1, detail: 'vai criar/atualizar no destino' };

  const next = { ...sourceDoc, _id: targetUserId };
  await targetCol.updateOne(
    { _id: targetUserId },
    { $set: next },
    { upsert: true }
  );

  return { moved: 1, detail: 'criado/atualizado no destino' };
}

async function copyProfile({ fromUsersCol, toUsersCol, sourceUser, targetUser, dryRun }) {
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

  const src = await fromUsersCol.findOne({ _id: sourceUser._id });
  const patch = {};
  for (const field of fieldsToCopy) {
    if (src[field] !== undefined) patch[field] = src[field];
  }

  if (dryRun) return { copiedFields: Object.keys(patch).length };

  await toUsersCol.updateOne(
    { _id: targetUser._id },
    { $set: patch }
  );

  return { copiedFields: Object.keys(patch).length };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const fromUri = requireArg(args, 'from-uri');
  const toUri = requireArg(args, 'to-uri');
  const fromEmail = requireArg(args, 'from-email').toLowerCase();
  const toEmail = requireArg(args, 'to-email').toLowerCase();
  const dryRun = Boolean(args['dry-run']);
  const shouldCopyProfile = Boolean(args['copy-profile']);

  const fromConn = await mongoose.createConnection(fromUri).asPromise();
  const toConn = await mongoose.createConnection(toUri).asPromise();

  try {
    const fromDb = fromConn.db;
    const toDb = toConn.db;

    const fromUsers = fromDb.collection('users');
    const toUsers = toDb.collection('users');

    const sourceUser = await findUser(fromUsers, fromEmail);
    if (!sourceUser) {
      throw new Error(`Usuario de origem nao encontrado por email: ${fromEmail}`);
    }

    const targetUser = await findUser(toUsers, toEmail);
    if (!targetUser) {
      throw new Error(`Usuario de destino nao encontrado por email: ${toEmail}`);
    }

    console.log('--- Migracao cross-db por email ---');
    console.log(`Origem : ${sourceUser.name || '(sem nome)'} <${sourceUser.email}> (${sourceUser._id})`);
    console.log(`Destino: ${targetUser.name || '(sem nome)'} <${targetUser.email}> (${targetUser._id})`);
    console.log(`Modo   : ${dryRun ? 'DRY-RUN (sem escrita)' : 'EXECUCAO REAL'}`);

    const ownershipCollections = [
      'flashcarddecks',
      'flashcards',
      'planners',
      'schedules',
      'sessions',
      'questionattempts',
      'mockexamresults',
      'studysummaries',
      'mnemonics',
      'notificationjobs',
      'deadlinereminders',
      'pdffolders',
      'pdfdocuments',
      'pdfchunks',
    ];

    const singletonCollections = [
      'jarvis',
      'mindmaps',
    ];

    const summary = [];

    for (const name of ownershipCollections) {
      const sourceCol = fromDb.collection(name);
      const targetCol = toDb.collection(name);
      const result = await upsertManyDocs({
        sourceCol,
        targetCol,
        sourceUserId: sourceUser._id,
        targetUserId: targetUser._id,
        dryRun,
      });
      summary.push({ collection: name, ...result });
    }

    for (const name of singletonCollections) {
      const sourceCol = fromDb.collection(name);
      const targetCol = toDb.collection(name);
      const result = await upsertSingletonByUserId({
        sourceCol,
        targetCol,
        sourceUserId: sourceUser._id,
        targetUserId: targetUser._id,
        dryRun,
      });
      summary.push({ collection: name, ...result });
    }

    let profileInfo = null;
    if (shouldCopyProfile) {
      profileInfo = await copyProfile({
        fromUsersCol: fromUsers,
        toUsersCol: toUsers,
        sourceUser,
        targetUser,
        dryRun,
      });
    }

    console.log('');
    console.log('Resumo por colecao:');
    let total = 0;
    for (const item of summary) {
      total += Number(item.moved || 0);
      const detail = item.detail ? ` (${item.detail})` : '';
      console.log(`- ${item.collection}: ${item.moved}${detail}`);
    }
    if (profileInfo) {
      console.log(`- profile_fields: ${profileInfo.copiedFields}`);
    }
    console.log(`Total impactado: ${total}`);

    if (dryRun) {
      console.log('');
      console.log('Dry-run concluido. Rode sem --dry-run para aplicar.');
    }
  } finally {
    await fromConn.close();
    await toConn.close();
  }
}

main().catch((error) => {
  console.error('Falha na migracao:', error.message);
  process.exit(1);
});
