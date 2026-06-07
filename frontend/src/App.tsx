import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import AccessibilityOnboarding from './components/AccessibilityOnboarding';
import PremiumGuard from './components/PremiumGuard';
import BlockedGuard from './components/BlockedGuard';
import { routeImporters } from './utils/routePrefetch';

// Páginas públicas
const Landing = lazy(routeImporters.landing);
const Login = lazy(routeImporters.login);
const Register = lazy(routeImporters.register);
const ForgotPassword = lazy(routeImporters.forgotPassword);
const ResetPassword = lazy(routeImporters.resetPassword);

// Páginas do app — cada uma vira um chunk separado
const Dashboard = lazy(routeImporters.dashboard);
const Planner = lazy(routeImporters.planner);
const Flashcards = lazy(routeImporters.flashcards);
const Schedule = lazy(routeImporters.schedule);
const Analytics = lazy(routeImporters.analytics);
const Settings = lazy(routeImporters.settings);
const Upgrade = lazy(routeImporters.upgrade);
const PaymentSuccess = lazy(routeImporters.paymentSuccess);
const JarvisPage = lazy(routeImporters.jarvis);
const MindMapPage = lazy(routeImporters.mindmap);
const QuestionBankPage = lazy(routeImporters.questionBank);
const ReminderSessionPage = lazy(routeImporters.reminders);
const PomodoroPage = lazy(routeImporters.pomodoro);
const Blocked = lazy(routeImporters.blocked);
const ManualsPage = lazy(routeImporters.manuals);
const PdfLibraryPage = lazy(routeImporters.pdfLibrary);
const StudySummariesPage = lazy(routeImporters.studySummaries);
const CoursesPage = lazy(routeImporters.courses);
const CommunityPage = lazy(routeImporters.community);
const HowToStudyPage = lazy(routeImporters.howToStudy);
const NotesPage = lazy(routeImporters.notes);
const LessonsPage = lazy(routeImporters.lessons);
const StoriesPage = lazy(routeImporters.stories);
const GoalsManagerPage = lazy(routeImporters.goalsManager);
const PublicDecksPage = lazy(routeImporters.publicDecks);

// Fallback mínimo durante carregamento do chunk
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]" role="status" aria-live="polite" aria-label="Carregando página">
      <div className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Blocked access page */}
          <Route
            path="/app/blocked"
            element={
              <ProtectedRoute>
                <Blocked />
              </ProtectedRoute>
            }
          />

          {/* Protected app routes */}
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/upgrade"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Upgrade />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/payment-success"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PaymentSuccess />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/planner"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Planner Kanban">
                      <Planner />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/flashcards"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Flashcards com revisão espaçada">
                      <Flashcards />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/schedule"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Cronograma automático">
                      <Schedule />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/analytics"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Análises e estatísticas">
                      <Analytics />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/jarvis"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Tigas IA">
                      <JarvisPage />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/mindmap"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Mapa Mental">
                      <MindMapPage />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/reminders"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <ReminderSessionPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/pomodoro"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PomodoroPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/settings"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/question-bank"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Banco de Questões">
                      <QuestionBankPage />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/pdf-library"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Biblioteca de PDFs">
                      <PdfLibraryPage />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/summaries"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PremiumGuard feature="Biblioteca de Resumos">
                      <StudySummariesPage />
                    </PremiumGuard>
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/manuals"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <ManualsPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/courses"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <CoursesPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/how-to-study"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <HowToStudyPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/community"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <CommunityPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/notes"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <NotesPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/lessons"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <LessonsPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/stories"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <StoriesPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/goals"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <GoalsManagerPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/public-decks"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <AppLayout>
                    <PublicDecksPage />
                  </AppLayout>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          <AccessibilityOnboarding />
        </BrowserRouter>
      </AuthProvider>
    </PreferencesProvider>
  );
}
