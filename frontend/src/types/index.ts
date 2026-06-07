export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  plan: string;
  area: string;
  goal: string;
  weekly_goal_hours: number;
  billingDocument?: string;
  created_at: string;
  trial_started_at?: string;
  trial_ends_at?: string;
  grace_period_ends_at?: string;
  subscriptionStatus?: string;
  access?: {
    blocked: boolean;
    type?: 'premium' | 'grace' | 'free';
    daysLeft?: number;
    reason?: 'payment_overdue' | 'payment_required';
  };
}

export interface PlannerItem {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  status: 'todo' | 'in-progress' | 'done';
  difficulty: number;
  next_review: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  name: string;
  color: string;
  description: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  deck_id: string | null;
  subject: string;
  question: string;
  answer: string;
  difficulty: number;
  next_review: string;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface FlashcardDeckProgress {
  id: string;
  user_id: string;
  deck_id: string;
  deck_name: string;
  deck_color: string;
  last_reviewed_at: string;
  reviewed_count: number;
  correct_count: number;
  wrong_count: number;
  total_cards: number;
  due_today: number;
  accuracy: number;
  last_card_id?: string | null;
  last_card_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlashcardsProgressSummary {
  tracked_decks: number;
  reviewed_total: number;
  correct_total: number;
  wrong_total: number;
  due_today_total: number;
}

export interface FlashcardsProgressResponse {
  progress: FlashcardDeckProgress[];
  recentDecks: FlashcardDeckProgress[];
  dueTodayDecks: FlashcardDeckProgress[];
  summary: FlashcardsProgressSummary;
  today: string;
}

export interface ScheduleItem {
  id: string;
  user_id: string;
  day_of_week: number;
  subject: string;
  duration_minutes: number;
  time_slot: string;
  color: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject: string;
  duration_minutes: number;
  correct_answers: number;
  total_questions: number;
  session_date: string;
  created_at: string;
}

export interface AnalyticsData {
  last7Days: Array<{ session_date: string; total_minutes: number }>;
  weeklyMinutes: number;
  subjectAccuracy: Array<{ subject: string; correct: number; total: number; accuracy: number }>;
  streak: number;
  flashcardStats: { total: number; total_reviews: number };
  plannerStats: { total: number; done: number; in_progress: number };
  todayStats?: {
    questions: number;
    correct: number;
    accuracy: number;
    flashcardsReviewed: number;
    lessons: number;
  };
  activityHeatmap?: Array<{ date: string; minutes: number }>;
}

export interface JarvisReminder {
  id: string;
  text: string;
  due_at: string;
  done: boolean;
  created_at: string;
}

export interface JarvisMessage {
  role: 'user' | 'jarvis';
  content: string;
  timestamp: string;
}

export interface NectarAction {
  type: 'task' | 'reminder' | 'completion' | 'flashcard';
  label: string;
  created: boolean;
  due?: string;
  quantity?: number | null;
  reminder?: JarvisReminder;
  id?: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  subject: string;
  level: number;
  x: number;
  y: number;
  type: 'root' | 'branch' | 'leaf';
  completed: boolean;
  unlocked: boolean;
  parent_id: string | null;
}

export interface MindMapEdge {
  from: string;
  to: string;
}

export interface MindMapChallenge {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: number;
  xp_reward: number;
  status: 'pending' | 'accepted' | 'completed';
  created_at: string;
  due_at: string;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  challenges: MindMapChallenge[];
  total_xp: number;
  insights?: MindMapInsights;
}

export interface MindMapInsights {
  focusSeries14: Array<{ date: string; minutes: number }>;
  weeklyComparison: { current14: number; previous14: number; trendPct: number };
  plannerCompletionRate: number;
  flashcardReviews: number;
  accuracyBySubject: Array<{ subject: string; accuracy: number; total: number }>;
  progressSignals: string[];
  regressionSignals: string[];
  weakSubjects: Array<{ subject: string; mins: number; accuracy: number; weaknessScore: number }>;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  original_price: number;
  period: string;
  popular: boolean;
  discount?: string;
  pix_discount?: string;
}

export interface ApiError {
  error: string;
}

export interface QuestionBankItem {
  id: string;
  subject: string;
  phase: 'basico' | 'clinico' | 'internato' | 'residencia';
  statement: string;
  options: string[];
  explanation: string;
  difficulty: number;
}

export interface QuestionBankStats {
  total_attempts: number;
  correct_attempts: number;
  accuracy: number;
}

export interface MockExamRankingItem {
  id?: string;
  accuracy: number;
  correct_answers: number;
  total_questions: number;
  duration_seconds: number;
  phase: 'basico' | 'clinico' | 'internato' | 'residencia' | 'geral';
  created_at: string;
}

export interface Lesson {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration?: string;
  duration_seconds?: number;
  course_id?: string;
  tags?: string[];
  free: boolean;
  canAccess?: boolean;
  unlockedBySequence?: boolean;
  progress?: LessonProgress | null;
  order?: number;
  createdAt?: string;
}

export interface LessonProgress {
  watched_seconds: number;
  duration_seconds: number;
  completed: boolean;
  last_position_seconds: number;
  updatedAt?: string;
}

export interface LessonFeedbackItem {
  _id?: string;
  user_id: string;
  lesson_id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonFeedbackResponse {
  average_rating: number;
  total: number;
  items: LessonFeedbackItem[];
}

export interface CourseRoadmap {
  _id?: string;
  title: string;
  description?: string;
  free: boolean;
  total_lessons: number;
  completed_lessons: number;
  completion_pct: number;
  lessons: Lesson[];
}

export interface DailyPlanBlock {
  type: string;
  title: string;
  detail: string;
  minutes: number;
  priority: 'alta' | 'media' | 'baixa';
}

export interface StudySummary {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  source_text: string;
  bullets: string[];
  key_terms: string[];
  mindmap_nodes: string[];
  created_at: string;
}

export interface MnemonicItem {
  id: string;
  user_id: string;
  term: string;
  phrase: string;
  context: string;
  created_at: string;
}

export interface DeadlineReminder {
  id: string;
  user_id: string;
  title: string;
  kind: 'prova' | 'trabalho';
  alert_whatsapp?: string;
  due_at: string;
  active: boolean;
  trigger_status?: {
    d7: 'queued' | 'processing' | 'retrying' | 'sent' | 'failed' | 'missing';
    d2: 'queued' | 'processing' | 'retrying' | 'sent' | 'failed' | 'missing';
  };
  schedule_meta?: {
    d7_job_id?: string | null;
    d2_job_id?: string | null;
    d7_notify_at?: string | null;
    d2_notify_at?: string | null;
  };
  created_at: string;
  updated_at: string;
}
