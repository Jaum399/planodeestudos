import axios from 'axios';

const viteEnv = (import.meta as any)?.env || {};
const configuredBaseUrl = (viteEnv.VITE_API_BASE_URL as string | undefined)?.trim();

const api = axios.create({
  baseURL: configuredBaseUrl || '/api',
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
  create: (data: { subject: string; question: string; answer: string; deck_id?: string | null }) =>
    api.post('/flashcards', data),
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
  ranking: () => api.get('/question-bank/simulate/ranking'),
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
