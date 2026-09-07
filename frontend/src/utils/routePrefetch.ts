const routeImporters = {
  landing: () => import('../pages/Landing'),
  login: () => import('../pages/Login'),
  register: () => import('../pages/Register'),
  forgotPassword: () => import('../pages/ForgotPassword'),
  resetPassword: () => import('../pages/ResetPassword'),
  dashboard: () => import('../pages/app/Dashboard'),
  planner: () => import('../pages/app/Planner'),
  flashcards: () => import('../pages/app/Flashcards'),
  schedule: () => import('../pages/app/Schedule'),
  analytics: () => import('../pages/app/Analytics'),
  settings: () => import('../pages/app/Settings'),
  upgrade: () => import('../pages/app/Upgrade'),
  paymentSuccess: () => import('../pages/app/PaymentSuccess'),
  jarvis: () => import('../pages/app/Jarvis'),
  mindmap: () => import('../pages/app/MindMap'),
  questionBank: () => import('../pages/app/QuestionBank'),
  reminders: () => import('../pages/app/ReminderSession'),
  pomodoro: () => import('../pages/app/Pomodoro'),
  blocked: () => import('../pages/app/Blocked'),
  manuals: () => import('../pages/app/Manuals'),
  pdfLibrary: () => import('../pages/app/PdfLibrary'),
  studySummaries: () => import('../pages/app/StudySummaries'),
  courses: () => import('../pages/app/Courses'),
  community: () => import('../pages/app/Community'),
  howToStudy: () => import('../pages/app/HowToStudy'),
  notes: () => import('../pages/app/Notes'),
  lessons: () => import('../pages/app/Lessons'),
  stories: () => import('../pages/app/Stories'),
  goalsManager: () => import('../pages/app/GoalsManager'),
  publicDecks: () => import('../pages/app/PublicDecks'),
  mockExams: () => import('../pages/app/MockExams'),
  leaderboards: () => import('../pages/app/Leaderboards'),
  achievements: () => import('../pages/app/Achievements'),
};

const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  '/': routeImporters.landing,
  '/login': routeImporters.login,
  '/register': routeImporters.register,
  '/forgot-password': routeImporters.forgotPassword,
  '/reset-password': routeImporters.resetPassword,
  '/app/dashboard': routeImporters.dashboard,
  '/app/planner': routeImporters.planner,
  '/app/flashcards': routeImporters.flashcards,
  '/app/schedule': routeImporters.schedule,
  '/app/analytics': routeImporters.analytics,
  '/app/settings': routeImporters.settings,
  '/app/upgrade': routeImporters.upgrade,
  '/app/payment-success': routeImporters.paymentSuccess,
  '/app/jarvis': routeImporters.jarvis,
  '/app/mindmap': routeImporters.mindmap,
  '/app/question-bank': routeImporters.questionBank,
  '/app/reminders': routeImporters.reminders,
  '/app/pomodoro': routeImporters.pomodoro,
  '/app/blocked': routeImporters.blocked,
  '/app/manuals': routeImporters.manuals,
  '/app/pdf-library': routeImporters.pdfLibrary,
  '/app/summaries': routeImporters.studySummaries,
  '/app/courses': routeImporters.courses,
  '/app/community': routeImporters.community,
  '/app/how-to-study': routeImporters.howToStudy,
  '/app/notes': routeImporters.notes,
  '/app/lessons': routeImporters.lessons,
  '/app/stories': routeImporters.stories,
  '/app/goals': routeImporters.goalsManager,
  '/app/public-decks': routeImporters.publicDecks,
  '/app/mock-exams': routeImporters.mockExams,
  '/app/leaderboards': routeImporters.leaderboards,
  '/app/achievements': routeImporters.achievements,
};

const prefetchedRoutes = new Set<string>();

export function preloadRoute(path: string) {
  const importer = routePrefetchMap[path];
  if (!importer || prefetchedRoutes.has(path)) return;
  prefetchedRoutes.add(path);
  importer().catch(() => {
    prefetchedRoutes.delete(path);
  });
}

export function preloadRoutes(paths: string[]) {
  paths.forEach(preloadRoute);
}

export { routeImporters };