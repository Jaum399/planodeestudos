import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** Redireciona para /app/blocked se o usuário não tiver acesso ativo */
export default function BlockedGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user?.access?.blocked) {
    return <Navigate to="/app/blocked" replace />;
  }

  return <>{children}</>;
}
