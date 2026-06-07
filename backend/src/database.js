const mongoose = require('mongoose');
const { createFileDatabase } = require('./filePersistence');

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

const flashcardDeckSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#7c3aed' },
  description: { type: String, default: '' },
  created_at: { type: String },
  updated_at: { type: String },
}, { _id: false });

const flashcardSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  deck_id: { type: String, default: null },
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

const flashcardProgressSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // `${user_id}_${deck_id || 'none'}`
  user_id: { type: String, required: true },
  deck_id: { type: String, required: true },
  last_reviewed_at: { type: String, required: true },
  reviewed_count: { type: Number, default: 0 },
  correct_count: { type: Number, default: 0 },
  wrong_count: { type: Number, default: 0 },
  last_card_id: { type: String, default: null },
  last_card_at: { type: String, default: null },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

flashcardProgressSchema.index({ user_id: 1, deck_id: 1 }, { unique: true });

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

const pdfFolderSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#7c3aed' },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

pdfFolderSchema.index({ user_id: 1, created_at: -1 });

const pdfDocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  folder_id: { type: String, default: null },
  title: { type: String, required: true },
  file_name: { type: String, required: true },
  mime_type: { type: String, default: 'application/pdf' },
  size_bytes: { type: Number, default: 0 },
  data_url: { type: String, default: '' },
  storage_mode: { type: String, enum: ['inline', 'chunked'], default: 'inline' },
  upload_status: { type: String, enum: ['uploading', 'ready'], default: 'ready' },
  total_chunks: { type: Number, default: 0 },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

pdfDocumentSchema.index({ user_id: 1, created_at: -1 });
pdfDocumentSchema.index({ user_id: 1, folder_id: 1, created_at: -1 });

const pdfChunkSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  document_id: { type: String, required: true },
  user_id: { type: String, required: true },
  chunk_index: { type: Number, required: true },
  chunk_data: { type: String, required: true },
  created_at: { type: String, required: true },
}, { _id: false });

pdfChunkSchema.index({ document_id: 1, document_id: 1, chunk_index: 1 });

const userGoalsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  goal_name: { type: String, required: true },
  goal_type: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  target_value: { type: Number, required: true },
  target_unit: { type: String, enum: ['cards', 'minutes'], required: true },
  current_progress: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  started_at: { type: String, required: true },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

userGoalsSchema.index({ user_id: 1, status: 1 });
userGoalsSchema.index({ user_id: 1, started_at: 1 });

const dailyGoalProgressSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // `${user_id}_${goal_id}_${date}`
  user_id: { type: String, required: true },
  goal_id: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  progress_value: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  recorded_at: { type: String, required: true },
}, { _id: false });

dailyGoalProgressSchema.index({ user_id: 1, goal_id: 1, date: 1 }, { unique: true });
dailyGoalProgressSchema.index({ user_id: 1, date: 1 });

// ── MEDSIMPLE MIGRATION SCHEMAS ────────────────────────────────────────────────

// Enhanced User Profile (add to users collection)
// Note: Add these fields to userSchema updates

// Card Reviews Collection (tracks individual card review sessions)
const cardReviewSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // composite: user_id_card_id_timestamp
  user_id: { type: String, required: true },
  card_id: { type: String, required: true },
  deck_id: { type: String, required: true },
  difficulty: { type: Number, min: 0, max: 3, required: true },
  time_spent_seconds: { type: Number, default: 0 },
  is_correct: { type: Boolean, required: true },
  confidence: { type: Number, min: 1, max: 5, default: 3 },
  new_ease_factor: { type: Number, required: true },
  new_interval_days: { type: Number, required: true },
  new_next_review: { type: String, required: true },
  reviewed_at: { type: String, required: true },
}, { _id: false });

cardReviewSchema.index({ user_id: 1, reviewed_at: -1 });
cardReviewSchema.index({ card_id: 1, reviewed_at: -1 });
cardReviewSchema.index({ deck_id: 1, reviewed_at: -1 });

// Public Deck Library (searchable, shareable decks)
const publicDeckLibrarySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  deck_id: { type: String, required: true },
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  subject: { type: String, required: true },
  category: { type: String, default: '' },
  tags: [String],
  difficulty: { type: String, enum: ['iniciante', 'intermediario', 'avancado'], default: 'intermediario' },
  rating: { type: Number, min: 1, max: 5, default: 3 },
  rating_count: { type: Number, default: 0 },
  imports: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  is_verified: { type: Boolean, default: false },
  verification_notes: { type: String, default: '' },
  verified_by_admin: { type: String, default: null },
  visibility: { type: String, enum: ['draft', 'published', 'featured'], default: 'draft' },
  preview_cards: [String], // First 5 card IDs
  listed_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

publicDeckLibrarySchema.index({ subject: 1, difficulty: 1, visibility: 1 });
publicDeckLibrarySchema.index({ rating: -1, imports: -1 });
publicDeckLibrarySchema.index({ tags: 1 });

// Leaderboard & Rankings
const leaderboardSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'all_time'], required: true },
  period_start: { type: String, default: null },
  period_end: { type: String, default: null },
  rankings: [{
    rank: Number,
    user_id: String,
    username: String,
    score: Number,
    metric: { type: String, enum: ['study_minutes', 'cards_learned', 'accuracy', 'streak'] },
  }],
  updated_at: { type: String, required: true },
}, { _id: false });

leaderboardSchema.index({ period: 1, updated_at: -1 });

// Achievements & Badges
const userAchievementsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  achievement_id: { type: String, required: true },
  achievement_name: { type: String, required: true },
  achievement_icon: { type: String, default: '' },
  achievement_description: { type: String, default: '' },
  type: { type: String, enum: ['milestone', 'streak', 'perfection', 'collection', 'social'], required: true },
  unlocked_at: { type: String, required: true },
  progress: { type: Number, default: 0 },
  progress_max: { type: Number, default: 0 },
  is_featured: { type: Boolean, default: false },
  created_at: { type: String, required: true },
}, { _id: false });

userAchievementsSchema.index({ user_id: 1, unlocked_at: -1 });
userAchievementsSchema.index({ user_id: 1, type: 1 });

// Study Recommendations
const studyRecommendationsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  type: { type: String, enum: ['deck', 'question_set', 'weakness_topic', 'peer_deck'], required: true },
  target_id: { type: String, required: true },
  target_name: { type: String, required: true },
  reason: { type: String, enum: ['weak_area', 'trending', 'peer_favorite', 'based_on_goals'], required: true },
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  dismissed: { type: Boolean, default: false },
  clicked: { type: Boolean, default: false },
  created_at: { type: String, required: true },
  dismissed_at: { type: String, default: null },
}, { _id: false });

studyRecommendationsSchema.index({ user_id: 1, dismissed: 1, created_at: -1 });

// Deck Sharing Permissions
const deckSharingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  deck_id: { type: String, required: true },
  owner_id: { type: String, required: true },
  shared_with: [{
    user_id: String,
    permission: { type: String, enum: ['view', 'edit'] },
    shared_at: String,
  }],
  is_public: { type: Boolean, default: false },
  public_url: { type: String, default: null },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
}, { _id: false });

deckSharingSchema.index({ deck_id: 1 });
deckSharingSchema.index({ owner_id: 1 });
deckSharingSchema.index({ 'shared_with.user_id': 1 });

// ── Models ────────────────────────────────────────────────────────────────────

function getModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

let databaseDriver = 'mongo';
let fileDatabase = null;

function getFileDatabase() {
  if (!fileDatabase) {
    fileDatabase = createFileDatabase();
  }
  return fileDatabase;
}

function getDatabase() {
  if (databaseDriver === 'file') {
    return getFileDatabase();
  }

  return {
    users:      getModel('User', userSchema),
    planner:    getModel('Planner', plannerSchema),
    flashcards: getModel('Flashcard', flashcardSchema),
    flashcardDecks: getModel('FlashcardDeck', flashcardDeckSchema),
    flashcardProgress: getModel('FlashcardProgress', flashcardProgressSchema),
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
    pdfFolders: getModel('PdfFolder', pdfFolderSchema),
    pdfDocuments: getModel('PdfDocument', pdfDocumentSchema),
    pdfChunks: getModel('PdfChunk', pdfChunkSchema),
    userGoals: getModel('UserGoal', userGoalsSchema),
    dailyGoalProgress: getModel('DailyGoalProgress', dailyGoalProgressSchema),

    // MedSimple Migration Models
    cardReviews: getModel('CardReview', cardReviewSchema),
    publicDeckLibrary: getModel('PublicDeckLibrary', publicDeckLibrarySchema),
    leaderboards: getModel('Leaderboard', leaderboardSchema),
    userAchievements: getModel('UserAchievement', userAchievementsSchema),
    studyRecommendations: getModel('StudyRecommendation', studyRecommendationsSchema),
    deckSharing: getModel('DeckSharing', deckSharingSchema),
  };
}

// ── Connection ─────────────────────────────────────────────────────────────────

let connected = false;
let connectPromise = null;

function getPersistenceDriver() {
  return String(process.env.PERSISTENCE_DRIVER || 'auto').trim().toLowerCase();
}

function canFallbackToFileDatabase() {
  const driver = getPersistenceDriver();
  if (driver === 'file') return true;
  if (driver === 'mongo') return false;

  // No Vercel (produção serverless), /tmp é ephêmero — NUNCA fazer fallback
  // silenciosamente, pois dados seriam perdidos no próximo cold start.
  if (process.env.VERCEL) {
    return false;
  }

  // Se uma URI do Mongo foi configurada, falha de conexão deve ser explícita.
  // Isso evita gravar dados em arquivo local sem o operador perceber.
  if (getMongoUri()) {
    return String(process.env.ENABLE_FILE_DB_FALLBACK || '').toLowerCase() === 'true';
  }

  // Em produção, fallback em arquivo só deve ocorrer quando habilitado explicitamente.
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    return String(process.env.ENABLE_FILE_DB_FALLBACK || '').toLowerCase() === 'true';
  }

  // Em desenvolvimento/local, mantém fallback por padrão para facilitar operação offline.
  return process.env.ENABLE_FILE_DB_FALLBACK !== 'false';
}

function activateFileDatabase(reason) {
  databaseDriver = 'file';
  getFileDatabase();
  if (reason) {
    console.warn(`[Persistence] usando persistência em arquivo: ${reason}`);
  }
}

function normalizeMongoCandidate(candidate) {
  if (!candidate) return '';

  // Normaliza casos comuns de configuração quebrada no painel/env CLI.
  let value = String(candidate)
    .replace(/\uFEFF/g, '')
    .replace(/\\r|\\n/g, '')
    .trim();

  // Remove aspas extras envolvendo ou contaminando o valor.
  value = value.replace(/^["']+|["']+$/g, '').trim();

  // Aceita valores no formato CHAVE=mongodb://... e extrai apenas a URI.
  const mongoStart = value.indexOf('mongodb');
  if (mongoStart > 0) {
    value = value.slice(mongoStart).trim();
  }

  // Reaplica a limpeza para casos como ""mongodb://..."\r\n"
  value = value.replace(/^["']+|["']+$/g, '').trim();

  if (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')) {
    return value;
  }

  return '';
}

function getMongoUriCandidates() {
  const candidates = [
    process.env.MONGODB_URI,
    process.env.appordexvercelapp_MONGODB_URI,
    process.env.appplanodeestudosvercelapp_MONGODB_URI,
  ];

  const normalized = [];
  for (const candidate of candidates) {
    const value = normalizeMongoCandidate(candidate);
    if (!value || normalized.includes(value)) continue;
    normalized.push(value);
  }

  return normalized;
}

function getMongoUri() {
  return getMongoUriCandidates()[0] || '';
}

async function initializeDatabase() {
  const driver = getPersistenceDriver();

  if (driver === 'file') {
    activateFileDatabase('driver forçado por PERSISTENCE_DRIVER=file');
    return;
  }

  if (databaseDriver === 'file') {
    getFileDatabase();
    return;
  }

  if (connected) return;
  if (connectPromise) {
    await connectPromise;
    return;
  }

  const uris = getMongoUriCandidates();
  if (!uris.length) {
    if (canFallbackToFileDatabase()) {
      activateFileDatabase('MONGODB_URI não configurada');
      return;
    }
    throw new Error('MONGODB_URI não configurada. Adicione no .env ou no Vercel Environment Variables.');
  }

  connectPromise = (async () => {
    let lastError = null;

    for (const uri of uris) {
      try {
        await mongoose.connect(uri, {
          dbName: 'ordex',
          serverSelectionTimeoutMS: 15000,
          connectTimeoutMS: 15000,
          socketTimeoutMS: 30000,
        });

        connected = true;
        databaseDriver = 'mongo';
        const safeUri = uri.replace(/:([^@:/?]+)@/, ':<hidden>@');
        console.log('[DB] MongoDB Atlas conectado:', safeUri.slice(0, 80));
        return;
      } catch (err) {
        lastError = err;
        const safeUri = uri.replace(/:([^@:/?]+)@/, ':<hidden>@');
        console.warn(`[DB] Falha ao conectar usando URI candidata (${safeUri.slice(0, 80)}): ${err.message}`);
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect().catch(() => {});
        }
      }
    }

    connected = false;
    if (canFallbackToFileDatabase()) {
      activateFileDatabase(lastError ? lastError.message : 'falha ao conectar no MongoDB');
      return;
    }

    throw lastError || new Error('Falha ao conectar ao MongoDB com as URIs configuradas.');
  })().finally(() => {
    connectPromise = null;
  });

  await connectPromise;
}

function getActiveDatabaseDriver() { return databaseDriver; }

module.exports = { getDatabase, initializeDatabase, getActiveDatabaseDriver };

