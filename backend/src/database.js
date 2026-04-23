const mongoose = require('mongoose');

// ── Schemas ───────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  whatsapp: { type: String, default: '' },
  plan: { type: String, default: 'free' },
  area: { type: String, default: '' },
  goal: { type: String, default: '' },
  weekly_goal_hours: { type: Number, default: 20 },
  billingDocument: { type: String, default: '' },
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  asaasCustomerId: { type: String, default: null },
  asaasPaymentId: { type: String, default: null },
  asaasPaymentStatus: { type: String, default: null },
  pending_plan_type: { type: String, default: null },
  subscriptionStatus: { type: String, default: null },
  // Trial gratuito de 7 dias
  trial_started_at: { type: String, default: null },
  trial_ends_at: { type: String, default: null },
  // Período de carência de 3 dias após vencimento
  grace_period_ends_at: { type: String, default: null },
  reset_token: { type: String, default: null },
  reset_token_expires: { type: String, default: null },
  created_at: { type: String },
  updated_at: { type: String },
}, { _id: false });

// ── JARVIS Schema ──────────────────────────────────────────────────────────────
const jarvisSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // user_id
  known_topics: [String],
  weak_areas: [String],
  study_style: { type: mongoose.Schema.Types.Mixed, default: {} },
  reminders: [{
    id: String,
    text: String,
    due_at: String,
    done: { type: Boolean, default: false },
    created_at: String,
  }],
  history: [{
    role: String, // 'user' | 'jarvis'
    content: String,
    timestamp: String,
  }],
  updated_at: String,
}, { _id: false });

// ── MindMap Schema ─────────────────────────────────────────────────────────────
const mindMapNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  subject: { type: String, required: true },
  level: { type: Number, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  type: { type: String, enum: ['root', 'branch', 'leaf'], required: true },
  unlocked: { type: Boolean, default: false },
  parent_id: { type: String, default: null },
}, { _id: false });

const mindMapEdgeSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
}, { _id: false });

const mindMapChallengeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  subject: { type: String, required: true },
  difficulty: { type: Number, required: true },
  xp_reward: { type: Number, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'completed'] },
  created_at: { type: String, required: true },
  due_at: { type: String, required: true },
}, { _id: false });

const mindMapSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // user_id
  nodes: { type: [mindMapNodeSchema], default: [] },
  edges: { type: [mindMapEdgeSchema], default: [] },
  challenges: { type: [mindMapChallengeSchema], default: [] },
  total_xp: { type: Number, default: 0 },
  updated_at: String,
}, { _id: false });

const plannerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, default: 'todo' },
  difficulty: { type: Number, default: 5 },
  notes: { type: String, default: '' },
  next_review: { type: String, default: null },
  created_at: { type: String },
  updated_at: { type: String },
}, { _id: false });

const flashcardSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  subject: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  difficulty: { type: Number, default: 0 },
  next_review: { type: String },
  review_count: { type: Number, default: 0 },
  ease_factor: { type: Number, default: 2.5 },
  interval_days: { type: Number, default: 1 },
  created_at: { type: String },
  updated_at: { type: String },
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  day_of_week: { type: Number, required: true },
  subject: { type: String, required: true },
  duration_minutes: { type: Number, required: true },
  time_slot: { type: String, default: '08:00' },
  color: { type: String, default: '#7c3aed' },
  created_at: { type: String },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  subject: { type: String, required: true },
  duration_minutes: { type: Number, required: true },
  correct_answers: { type: Number, default: 0 },
  total_questions: { type: Number, default: 0 },
  session_date: { type: String },
  created_at: { type: String },
}, { _id: false });

const notificationAttemptSchema = new mongoose.Schema({
  at: { type: String, required: true },
  channel: { type: String, enum: ['whatsapp', 'email'], required: true },
  success: { type: Boolean, required: true },
  detail: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const notificationJobSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  reminder_id: { type: String, required: true },
  status: {
    type: String,
    enum: ['queued', 'processing', 'retrying', 'sent', 'failed'],
    default: 'queued',
  },
  attempt_count: { type: Number, default: 0 },
  max_attempts: { type: Number, default: 5 },
  next_attempt_at: { type: String, required: true },
  sent_at: { type: String, default: null },
  last_error: { type: String, default: '' },
  channels: {
    whatsapp: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
    email: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
  },
  payload: {
    user_name: { type: String, default: '' },
    user_email: { type: String, default: '' },
    user_whatsapp: { type: String, default: '' },
    reminder_text: { type: String, required: true },
    reminder_due_at: { type: String, default: null },
    source: { type: String, default: 'jarvis' },
  },
  attempts: { type: [notificationAttemptSchema], default: [] },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

notificationJobSchema.index({ status: 1, next_attempt_at: 1 });
notificationJobSchema.index({ user_id: 1, reminder_id: 1 }, { unique: true });

const deadlineReminderSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  kind: { type: String, enum: ['prova', 'trabalho'], required: true },
  alert_whatsapp: { type: String, default: '' },
  due_at: { type: String, required: true },
  active: { type: Boolean, default: true },
  schedule_meta: {
    d7_job_id: { type: String, default: null },
    d2_job_id: { type: String, default: null },
    d7_notify_at: { type: String, default: null },
    d2_notify_at: { type: String, default: null },
  },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

deadlineReminderSchema.index({ user_id: 1, due_at: 1 });

const questionBankSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  subject: { type: String, required: true },
  phase: { type: String, enum: ['basico', 'clinico', 'internato', 'residencia'], required: true },
  statement: { type: String, required: true },
  options: { type: [String], default: [] },
  correct_index: { type: Number, required: true },
  explanation: { type: String, default: '' },
  difficulty: { type: Number, default: 3 },
  created_at: { type: String, required: true },
}, { _id: false });

const questionAttemptSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  question_id: { type: String, required: true },
  subject: { type: String, required: true },
  phase: { type: String, required: true },
  selected_index: { type: Number, required: true },
  is_correct: { type: Boolean, required: true },
  created_at: { type: String, required: true },
}, { _id: false });

questionAttemptSchema.index({ user_id: 1, created_at: -1 });
questionAttemptSchema.index({ user_id: 1, question_id: 1, created_at: -1 });

const studySummarySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  subject: { type: String, default: '' },
  source_text: { type: String, required: true },
  bullets: { type: [String], default: [] },
  key_terms: { type: [String], default: [] },
  mindmap_nodes: { type: [String], default: [] },
  created_at: { type: String, required: true },
}, { _id: false });

studySummarySchema.index({ user_id: 1, created_at: -1 });

const mnemonicSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  term: { type: String, required: true },
  phrase: { type: String, required: true },
  context: { type: String, default: '' },
  created_at: { type: String, required: true },
}, { _id: false });

mnemonicSchema.index({ user_id: 1, created_at: -1 });

const mockExamResultSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  phase: { type: String, enum: ['basico', 'clinico', 'internato', 'residencia', 'geral'], default: 'geral' },
  total_questions: { type: Number, required: true },
  correct_answers: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  duration_seconds: { type: Number, default: 0 },
  created_at: { type: String, required: true },
}, { _id: false });

mockExamResultSchema.index({ user_id: 1, created_at: -1 });
mockExamResultSchema.index({ user_id: 1, accuracy: -1, created_at: -1 });

// ── Models ────────────────────────────────────────────────────────────────────

function getModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

function getDatabase() {
  return {
    users:      getModel('User', userSchema),
    planner:    getModel('Planner', plannerSchema),
    flashcards: getModel('Flashcard', flashcardSchema),
    schedule:   getModel('Schedule', scheduleSchema),
    sessions:   getModel('Session', sessionSchema),
    jarvis:     getModel('Jarvis', jarvisSchema),
    mindmaps:   getModel('MindMap', mindMapSchema),
    notificationJobs: getModel('NotificationJob', notificationJobSchema),
    deadlineReminders: getModel('DeadlineReminder', deadlineReminderSchema),
    questionBank: getModel('QuestionBank', questionBankSchema),
    questionAttempts: getModel('QuestionAttempt', questionAttemptSchema),
    studySummaries: getModel('StudySummary', studySummarySchema),
    mnemonics: getModel('Mnemonic', mnemonicSchema),
    mockExamResults: getModel('MockExamResult', mockExamResultSchema),
  };
}

// ── Connection ─────────────────────────────────────────────────────────────────

let connected = false;
let connectPromise = null;

function getMongoUri() {
  const raw = process.env.MONGODB_URI;
  if (!raw) return '';
  // Vercel/env tooling can accidentally persist CRLF; trim keeps URI valid.
  return String(raw).trim();
}

async function initializeDatabase() {
  if (connected) return;
  if (connectPromise) {
    await connectPromise;
    return;
  }

  const uri = getMongoUri();
  if (!uri) {
    throw new Error('MONGODB_URI não configurada. Adicione no .env ou no Vercel Environment Variables.');
  }

  connectPromise = mongoose.connect(uri, {
    dbName: 'mentoria',
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 10000,
    family: 4,
  }).then(() => {
    connected = true;
    console.log('MongoDB conectado com sucesso');
  }).catch((err) => {
    connected = false;
    throw err;
  }).finally(() => {
    connectPromise = null;
  });

  await connectPromise;
}

module.exports = { getDatabase, initializeDatabase };

