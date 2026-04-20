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
    type?: 'premium' | 'trial' | 'grace' | 'free';
    daysLeft?: number;
    reason?: 'trial_expired' | 'payment_overdue';
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

export interface Flashcard {
  id: string;
  user_id: string;
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

export interface MedHubTissGuide {
  id: string;
  patient: string;
  operator: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
}

export interface MedHubProtocol {
  id: string;
  name: string;
  active: boolean;
}

export interface MedHubCredentialing {
  id: string;
  operator: string;
  stage: 'documents' | 'analysis' | 'approved';
}

export interface MedHubTeleQueue {
  id: string;
  patient: string;
  date: string;
  status: 'scheduled' | 'live' | 'finished';
}

export interface MedHubPrescription {
  id: string;
  patient: string;
  drug: string;
  created_at: string;
}

export interface MedHubRecordNote {
  id: string;
  patient: string;
  note: string;
  created_at: string;
}

export interface MedHubWorkspace {
  ai_slots: string[];
  tiss_guides: MedHubTissGuide[];
  protocols: MedHubProtocol[];
  credentialing: MedHubCredentialing[];
  tele_queue: MedHubTeleQueue[];
  visibility_stats: { patients: number; operators: number };
  prescriptions: MedHubPrescription[];
  record_notes: MedHubRecordNote[];
}

export type ClinicLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';

export interface ClinicLead {
  _id: string;
  full_name: string;
  email: string;
  ddd?: string;
  phone?: string;
  clinic_name?: string;
  cnpj?: string;
  crm?: string;
  source?: string;
  status: ClinicLeadStatus;
  created_at: string;
}

export interface ClinicLeadPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface MedHubMarketplaceItem {
  id: string;
  name: string;
  kind: string;
  ownership: 'public' | 'private' | 'unknown';
  city: string;
  state: string;
  address?: string;
  lat?: number | null;
  lon?: number | null;
  specialties?: string[];
  distance_km?: number | null;
  relevance_score?: number;
  specialty_match?: boolean;
  source: string;
  source_url: string;
}

export type MedHubCertificationStatus = 'pending' | 'verifying' | 'approved' | 'rejected';
export type MedHubCertificationType = 'clinic' | 'doctor' | 'both';

export interface MedHubCertification {
  id: string;
  type: MedHubCertificationType;
  contact_phone?: string | null;
  clinic_city?: string | null;
  clinic_state?: string | null;
  clinic_address?: string | null;
  cnpj?: string | null;
  cnpj_company_name?: string | null;
  cnpj_situation?: string | null;
  cnpj_activity?: string | null;
  cnpj_verified_at?: string | null;
  crm_number?: string | null;
  crm_state?: string | null;
  crm_name?: string | null;
  crm_specialty?: string | null;
  crm_verified_at?: string | null;
  status: MedHubCertificationStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  verified_at?: string | null;
}
