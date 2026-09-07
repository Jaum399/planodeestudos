import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const viteEnv = (import.meta as any)?.env || {};
const configuredBaseUrl = (viteEnv.VITE_API_BASE_URL as string | undefined)?.trim();
const appVersion = (viteEnv.VITE_APP_VERSION as string | undefined)?.trim() || 'web-latest';
const isNative = Capacitor.isNativePlatform();

function resolveApiBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl;
  // No app instalado (Android/iOS), não existe host local do frontend.
  // Mantemos o mesmo backend (Vercel + MongoDB Atlas) em produção.
  if (isNative) return 'https://ordexx.vercel.app/api';
  return '/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'X-Ordex-Client': isNative ? 'mobile-app' : 'web-app',
    'X-Ordex-App-Version': appVersion,
  },
});

function normalizeStoredToken(rawToken: string | null): string | null {
  if (!rawToken) return null;

  let normalized = String(rawToken).trim();
  if (!normalized) return null;

  if (/^bearer\s+/i.test(normalized)) {
    normalized = normalized.replace(/^bearer\s+/i, '').trim();
  }

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized || null;
}

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const rawToken = localStorage.getItem('ordex_token');
  const token = normalizeStoredToken(rawToken);

  if (rawToken && token && rawToken !== token) {
    localStorage.setItem('ordex_token', token);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const isAuthEndpoint = /\/auth\/(login|register|forgot-password|reset-password)$/.test(requestUrl);

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('ordex_token');
      localStorage.removeItem('ordex_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string; billingDocument: string; area?: string; whatsapp?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateMe: (data: { name?: string; area?: string; goal?: string; weekly_goal_hours?: number; billingDocument?: string; whatsapp?: string }) =>
    api.put('/auth/me', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/auth/password', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
};

// Planner
export const plannerApi = {
  getAll: () => api.get('/planner'),
  create: (data: { title: string; subject: string; status?: string; difficulty?: number; notes?: string }) =>
    api.post('/planner', data),
  update: (id: string, data: Partial<{ title: string; subject: string; status: string; difficulty: number; notes: string; next_review: string }>) =>
    api.put(`/planner/${id}`, data),
  delete: (id: string) => api.delete(`/planner/${id}`),
};

// Flashcards
export const flashcardsApi = {
  getAll: (deckId?: string | null) => api.get('/flashcards', { params: deckId ? { deck_id: deckId } : {} }),
  getReview: (deckId?: string | null) => api.get('/flashcards/review', { params: deckId ? { deck_id: deckId } : {} }),
  getProgress: (params?: { recentPage?: number; recentLimit?: number; dueTodayPage?: number; dueTodayLimit?: number }) =>
    api.get('/flashcards/progress', { params: params || {} }),
  create: (data: { subject: string; question: string; answer: string; deck_id?: string | null }) =>
    api.post('/flashcards', data),
  batchCreate: (cards: Array<{ subject: string; question: string; answer: string; deck_id?: string | null }>) =>
    api.post('/flashcards/batch', { cards }),
  review: (id: string, difficulty: number) =>
    api.put(`/flashcards/${id}/review`, { difficulty }),
  update: (id: string, data: { subject?: string; question?: string; answer?: string; deck_id?: string | null }) =>
    api.put(`/flashcards/${id}`, data),
  delete: (id: string) => api.delete(`/flashcards/${id}`),
};

// Flashcard Decks
export const flashcardDecksApi = {
  getAll: () => api.get('/flashcard-decks'),
  create: (data: { name: string; color?: string; description?: string }) =>
    api.post('/flashcard-decks', data),
  update: (id: string, data: { name?: string; color?: string; description?: string }) =>
    api.put(`/flashcard-decks/${id}`, data),
  delete: (id: string) => api.delete(`/flashcard-decks/${id}`),
};

// Schedule
export const scheduleApi = {
  getAll: () => api.get('/schedule'),
  create: (data: { day_of_week: number; subject: string; duration_minutes: number; time_slot?: string; color?: string }) =>
    api.post('/schedule', data),
  update: (id: string, data: Partial<{ day_of_week: number; subject: string; duration_minutes: number; time_slot: string; color: string }>) =>
    api.put(`/schedule/${id}`, data),
  delete: (id: string) => api.delete(`/schedule/${id}`),
};

// Analytics
export const analyticsApi = {
  getSummary: () => api.get('/analytics'),
  logSession: (data: { subject: string; duration_minutes: number; correct_answers?: number; total_questions?: number }) =>
    api.post('/analytics/session', data),
  getSessions: () => api.get('/analytics/sessions'),
};

// Payment
export const paymentApi = {
  getStatus: () => api.get('/payment/status'),
  createCheckout: (planType: string = 'standard') => api.post('/payment/create-checkout', { planType }),
  getPortal: () => api.get('/payment/portal'),
};

// JARVIS
export const jarvisApi = {
  getState: () => api.get('/jarvis/state'),
  chat: (message: string, options?: { voiceModel?: 'tigas_core' | 'manus_ia' | 'manus_ia_pro' | 'aios' | 'aios_coach'; nectarMode?: boolean }) => api.post('/jarvis/chat', { message, ...(options || {}) }),
  voiceFeedback: (feedbackType: 'interrupted' | 'repeated_command' | 'toggled_off') => api.post('/jarvis/voice-feedback', { feedbackType }),
  updateVoiceProfile: (voicePreset: 'adaptive' | 'calm' | 'objective' | 'energetic') => api.post('/jarvis/voice-profile', { voicePreset }),
  resetVoiceAdaptation: () => api.post('/jarvis/voice-feedback/reset'),
  doneReminder: (id: string) => api.put(`/jarvis/reminders/${id}/done`),
  deleteReminder: (id: string) => api.delete(`/jarvis/reminders/${id}`),
  visionAnalyze: (imageBase64: string, command: 'generate_cards' | 'explain' | 'extract_text', subject?: string, deckId?: string | null) =>
    api.post('/jarvis/vision', { imageBase64, command, subject: subject || 'Geral', deckId }),
  generateContent: (type: 'study_plan' | 'mock_exam' | 'summary' | 'mnemonics', topic: string, subject?: string, difficulty?: string, durationDays?: number) =>
    api.post('/jarvis/generate-content', { type, topic, subject: subject || 'Geral', difficulty: difficulty || 'medium', durationDays: durationDays || 7 }),
  analyzePerformance: (recentAttempts?: any[], weakAreas?: string[]) =>
    api.post('/jarvis/analyze-performance', { recentAttempts: recentAttempts || [], weakAreas: weakAreas || [] }),
};

// MindMap
export const mindmapApi = {
  get: () => api.get('/mindmap'),
  getInsights: () => api.get('/mindmap/insights'),
  completeNode: (nodeId: string) => api.post(`/mindmap/nodes/${nodeId}/complete`),
  updateChallenge: (challengeId: string, status: 'accepted' | 'completed') =>
    api.put(`/mindmap/challenges/${challengeId}`, { status }),
  reset: () => api.post('/mindmap/reset'),
  tigasAction: (action: string, payload: Record<string, unknown>) =>
    api.post('/mindmap/tigas-action', { action, payload }),
};

// Reminder Session (provas e trabalhos importantes)
export const reminderSessionApi = {
  getAll: (params?: { includeFinalized?: boolean }) => api.get('/reminder-session', { params }),
  create: (data: { title: string; kind: 'prova' | 'trabalho' | 'apresentacao'; due_at: string; alert_whatsapp?: string }) =>
    api.post('/reminder-session', data),
  update: (id: string, data: Partial<{ title: string; kind: 'prova' | 'trabalho' | 'apresentacao'; due_at: string; active: boolean; alert_whatsapp: string }>) =>
    api.put(`/reminder-session/${id}`, data),
  finalize: (id: string) => api.patch(`/reminder-session/${id}/finalize`),
  delete: (id: string) => api.delete(`/reminder-session/${id}`),
};

// Question Bank
export const questionBankApi = {
  getAll: (params?: { subject?: string; phase?: string; limit?: number }) =>
    api.get('/question-bank', { params }),
  attempt: (data: { question_id: string; selected_index: number }) =>
    api.post('/question-bank/attempt', data),
  simulate: (data: { phase?: string; count?: number; duration_seconds?: number; answers?: Array<{ question_id: string; selected_index: number }> }) =>
    api.post('/question-bank/simulate', data),
  ranking: () => api.get('/question-bank/simulate/ranking'),
};

// Lessons
export const lessonsApi = {
  getAll: () => api.get('/lessons'),
  getById: (id: string) => api.get(`/lessons/${id}`),
  getRoadmap: () => api.get('/lessons/courses/roadmap'),
  getAllProgress: () => api.get('/lessons/progress/all'),
  saveProgress: (id: string, data: { watched_seconds: number; duration_seconds?: number; last_position_seconds?: number; completed?: boolean }) =>
    api.put(`/lessons/${id}/progress`, data),
  complete: (id: string) => api.post(`/lessons/${id}/complete`),
  getFeedback: (id: string) => api.get(`/lessons/${id}/feedback`),
  saveFeedback: (id: string, data: { rating: number; comment?: string }) => api.post(`/lessons/${id}/feedback`, data),
};

// Study Tools (summaries + mnemonics)
export const studyToolsApi = {
  listMnemonics: () => api.get('/study-tools/mnemonics'),
  createMnemonic: (data: { term: string; phrase: string; context?: string }) =>
    api.post('/study-tools/mnemonics', data),
  listSummaries: () => api.get('/study-tools/summaries'),
  summarize: (data: { title: string; text: string; subject?: string }) =>
    api.post('/study-tools/summarize', data),
  summaryToFlashcards: (summaryId: string) =>
    api.post(`/study-tools/summaries/${summaryId}/to-flashcards`),
  generateFlashcardsByTheme: (data: { theme?: string; quantity?: number; subject?: string; deck_id?: string; source_text?: string }) =>
    api.post('/study-tools/flashcards/generate', data),
  dailyPlan: () => api.get('/study-tools/daily-plan'),
};

// Goals
export const goalsApi = {
  list: () => api.get('/goals'),
  create: (data: { goal_name: string; goal_type: string; target_value: number; target_unit: string }) =>
    api.post('/goals', data),
  getDailySummary: () => api.get('/goals/daily-summary'),
  getProgress: (id: string, days?: number) =>
    api.get(`/goals/${id}/progress`, { params: { days } }),
  updateProgress: (id: string) =>
    api.post(`/goals/${id}/update-progress`),
  update: (id: string, data: any) => api.put(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
};

// PDF Library
export const pdfApi = {
  list: () => api.get('/pdf-library'),
  createFolder: (name: string, color?: string) => api.post('/pdf-library/folders', { name, color }),
  deleteFolder: (id: string) => api.delete(`/pdf-library/folders/${id}`),
  uploadDocument: (data: { title: string; folder_id?: string | null; file_name: string; mime_type: string; size_bytes: number; data_url: string }) =>
    api.post('/pdf-library/documents', data),
  initUpload: (data: { title: string; folder_id?: string | null; file_name: string; mime_type: string; size_bytes: number }) =>
    api.post('/pdf-library/uploads/init', data),
  uploadChunk: (documentId: string, data: { chunk_index: number; total_chunks: number; chunk_data: string }) =>
    api.post(`/pdf-library/uploads/${documentId}/chunks`, data),
  completeUpload: (documentId: string) => api.post(`/pdf-library/uploads/${documentId}/complete`),
  extractText: (documentId: string) => api.post(`/pdf-library/documents/${documentId}/extract-text`),
  deleteDocument: (id: string) => api.delete(`/pdf-library/documents/${id}`),
  getDocumentBlob: (id: string) => api.get(`/pdf-library/documents/${id}/file`, { responseType: 'blob' }),
};

export default api;
