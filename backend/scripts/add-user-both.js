const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { createFileDatabase } = require('../src/filePersistence');

function normalizeMongoUri(raw) {
  let value = String(raw || '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  const mongoStart = value.indexOf('mongodb');
  if (mongoStart > 0) value = value.slice(mongoStart).trim();
  if (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')) return value;
  return '';
}

function buildUser({ email, password, name }) {
  const now = new Date().toISOString();
  return {
    _id: uuidv4(),
    name,
    email,
    password,
    whatsapp: '',
    plan: 'free',
    area: '',
    goal: '',
    weekly_goal_hours: 20,
    billingDocument: '',
    trial_started_at: now,
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: null,
    created_at: now,
    updated_at: now,
  };
}

async function upsertLocal(user) {
  const db = createFileDatabase();
  const existing = await db.users.findOne({ email: user.email });
  const now = new Date().toISOString();

  if (existing) {
    await db.users.findOneAndUpdate(
      { _id: existing._id },
      { $set: { password: user.password, updated_at: now } },
      { new: true }
    );
    return { ok: true, action: 'updated', id: existing._id };
  }

  const created = await db.users.create(user);
  return { ok: true, action: 'created', id: created._id };
}

async function upsertMongo(user, mongoUri) {
  if (!mongoUri) {
    return { ok: false, action: 'skipped', reason: 'MONGODB_URI not configured' };
  }

  const userSchema = new mongoose.Schema(
    {
      _id: String,
      name: String,
      email: { type: String, unique: true },
      password: String,
      updated_at: String,
    },
    { strict: false, versionKey: false, collection: 'users' }
  );

  const User = mongoose.models.UserSeed || mongoose.model('UserSeed', userSchema);
  await mongoose.connect(mongoUri, {
    dbName: 'ordex',
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    family: 4,
  });

  try {
    const existing = await User.findOne({ email: user.email });
    const now = new Date().toISOString();

    if (existing) {
      await User.updateOne({ _id: existing._id }, { $set: { password: user.password, updated_at: now } });
      return { ok: true, action: 'updated', id: existing._id };
    }

    const created = await User.create(user);
    return { ok: true, action: 'created', id: created._id };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];
  const nameArg = process.argv[4] || 'Thiago Tavares';
  const uriArg = process.argv[5] || '';

  if (!emailArg || !passwordArg) {
    console.error('Usage: node scripts/add-user-both.js <email> <password> [name] [mongodb_uri]');
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(String(passwordArg), 12);

  const user = buildUser({ email, password: passwordHash, name: String(nameArg).trim() });
  const mongoUri = normalizeMongoUri(uriArg || process.env.MONGODB_URI || process.env.appordexvercelapp_MONGODB_URI);

  const localResult = await upsertLocal(user);
  let mongoResult;
  try {
    mongoResult = await upsertMongo(user, mongoUri);
  } catch (err) {
    mongoResult = { ok: false, action: 'error', reason: err.message };
  }

  console.log(JSON.stringify({ local: localResult, mongo: mongoResult }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
