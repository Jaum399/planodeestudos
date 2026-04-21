import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const isNativePlatform = Capacitor.isNativePlatform();
const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const nativeApiBaseUrl =
  viteEnv.VITE_MOBILE_API_BASE_URL ||
  viteEnv.VITE_API_BASE_URL ||
  'https://app-planodeestudos.vercel.app/api';

const resolvedApiBaseUrl = isNativePlatform ? nativeApiBaseUrl : '/api';

const api = axios.create({
  baseURL: resolvedApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mentoria_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mentoria_token');
      localStorage.removeItem('mentoria_user');
      window.location.href = '/login';
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
  updateMe: (data: { name?: string; area?: string; goal?: string; weekly_goal_hours?: number; billingDocument?: string; whatsapp?: string; assistant_name?: string }) =>
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
  getAll: () => api.get('/flashcards'),
  getReview: () => api.get('/flashcards/review'),
  create: (data: { subject: string; question: string; answer: string }) =>
    api.post('/flashcards', data),
  review: (id: string, difficulty: number) =>
    api.put(`/flashcards/${id}/review`, { difficulty }),
  delete: (id: string) => api.delete(`/flashcards/${id}`),
  getDecks: () => api.get('/flashcards/decks'),
  createDeck: (data: any) => api.post('/flashcards/decks', data),
  deleteDeck: (id: string) => api.delete(`/flashcards/decks/${id}`),
  addCardToDeck: (deckId: string, flashcardId: string) =>
    api.post(`/flashcards/decks/${deckId}/add-card`, { flashcard_id: flashcardId }),
  removeCardFromDeck: (deckId: string, cardId: string) =>
    api.delete(`/flashcards/decks/${deckId}/remove-card/${cardId}`),
};

// PDF Library
export const pdfApi = {
  list: () => api.get('/pdfs'),
  createFolder: (name: string) => api.post('/pdfs/folders', { name }),
  deleteFolder: (id: string) => api.delete(`/pdfs/folders/${id}`),
  initUpload: (data: { title?: string; folder_id?: string | null; file_name: string; mime_type: string; size_bytes: number }) =>
    api.post('/pdfs/uploads/init', data),
  uploadChunk: (documentId: string, data: { chunk_index: number; total_chunks: number; chunk_data: string }) =>
    api.post(`/pdfs/uploads/${documentId}/chunks`, data),
  completeUpload: (documentId: string) => api.post(`/pdfs/uploads/${documentId}/complete`),
  uploadDocument: (data: { title?: string; folder_id?: string | null; file_name: string; mime_type: string; size_bytes: number; data_url: string }) =>
    api.post('/pdfs/documents', data),
  getDocumentFileUrl: (id: string) => `${resolvedApiBaseUrl}/pdfs/documents/${id}/file`,
  getDocumentBlob: (id: string) => api.get(`/pdfs/documents/${id}/file`, { responseType: 'blob' }),
  updateDocument: (id: string, data: { title?: string; folder_id?: string | null }) => api.put(`/pdfs/documents/${id}`, data),
  deleteDocument: (id: string) => api.delete(`/pdfs/documents/${id}`),
};

// Schedule
export const scheduleApi = {
  getAll: () => api.get('/schedule'),
  create: (data: { day_of_week: number; subject: string; duration_minutes: number; time_slot?: string; color?: string }) =>
    api.post('/schedule', data),
  delete: (id: string) => api.delete(`/schedule/${id}`),
};

// Analytics
export const analyticsApi = {
  getSummary: () => api.get('/analytics'),
  logSession: (data: { subject: string; duration_minutes: number; correct_answers?: number; total_questions?: number }) =>
    api.post('/analytics/session', data),
};

// Payment
export const paymentApi = {
  getStatus: () => api.get('/payment/status'),
  createCheckout: (planType: 'standard' = 'standard') => api.post('/payment/create-checkout', { planType }),
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
  create: (data: { title: string; kind: 'prova' | 'trabalho'; due_at: string; alert_whatsapp?: string }) =>
    api.post('/reminder-session', data),
  update: (id: string, data: Partial<{ title: string; kind: 'prova' | 'trabalho'; due_at: string; active: boolean; alert_whatsapp: string }>) =>
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
  getSimulationRanking: () => api.get('/question-bank/simulate/ranking'),
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
  dailyPlan: () => api.get('/study-tools/daily-plan'),
};

export default api;
