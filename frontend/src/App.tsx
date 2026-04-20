import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import PremiumGuard from './components/PremiumGuard';
import BlockedGuard from './components/BlockedGuard';
import MedHubPlanGuard from './components/MedHubPlanGuard';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ClinicSignup from './pages/ClinicSignup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/app/Dashboard';
import Planner from './pages/app/Planner';
import Flashcards from './pages/app/Flashcards';
import Schedule from './pages/app/Schedule';
import Analytics from './pages/app/Analytics';
import Settings from './pages/app/Settings';
import Upgrade from './pages/app/Upgrade';
import PaymentSuccess from './pages/app/PaymentSuccess';
import JarvisPage from './pages/app/Jarvis';
import MindMapPage from './pages/app/MindMap';
import ReminderSessionPage from './pages/app/ReminderSession';
import MedHubPage from './pages/app/MedHub';
import PomodoroPage from './pages/app/Pomodoro';
import Blocked from './pages/app/Blocked';

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cadastro-clinica" element={<ClinicSignup />} />
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
            path="/app/medhub"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <MedHubPlanGuard>
                    <AppLayout>
                      <MedHubPage />
                    </AppLayout>
                  </MedHubPlanGuard>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/medhub/:moduleKey"
            element={
              <ProtectedRoute>
                <BlockedGuard>
                  <MedHubPlanGuard>
                    <AppLayout>
                      <MedHubPage />
                    </AppLayout>
                  </MedHubPlanGuard>
                </BlockedGuard>
              </ProtectedRoute>
            }
          />
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

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PreferencesProvider>
  );
}
