import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function TrialBanner() {
  const { user } = useAuth();
  if (!user?.access) return null;

  const { type, daysLeft } = user.access;

  if (type === 'premium') return null;

  if (type === 'trial') {
    if ((daysLeft ?? 99) > 3) return null; // Only show when <= 3 days left
    return (
      <div className="mx-4 md:mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
        <Clock size={16} className="text-amber-400 shrink-0" />
        <p className="text-amber-300 flex-1">
          <span className="font-semibold">Teste grátis: {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}.</span>{' '}
          Após isso, o acesso será bloqueado.
        </p>
        <Link to="/app/upgrade" className="text-amber-400 font-semibold hover:text-amber-300 shrink-0">
          Assinar agora →
        </Link>
      </div>
    );
  }

  if (type === 'grace') {
    return (
      <div className="mx-4 md:mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm">
        <AlertTriangle size={16} className="text-red-400 shrink-0" />
        <p className="text-red-300 flex-1">
          <span className="font-semibold">Pagamento vencido!</span>{' '}
          Carência de {daysLeft} dia{daysLeft !== 1 ? 's' : ''}. Após isso o acesso será suspenso.
        </p>
        <Link to="/app/upgrade" className="text-red-400 font-semibold hover:text-red-300 shrink-0 flex items-center gap-1">
          <CreditCard size={13} /> Pagar agora
        </Link>
      </div>
    );
  }

  return null;
}
