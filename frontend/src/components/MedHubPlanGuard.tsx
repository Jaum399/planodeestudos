import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function MedHubPlanGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const hasMedHubPlan = user?.plan === 'premium_medhub' || Boolean((user as Record<string, unknown> | null)?.isPrivileged);
  if (!hasMedHubPlan) {
    return <Navigate to="/app/upgrade" replace />;
  }

  return <>{children}</>;
}
