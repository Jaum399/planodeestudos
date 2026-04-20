import { Link } from 'react-router-dom';
import { Lock, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PremiumGuardProps {
  children: React.ReactNode;
  feature?: string;
}

const FREE_PLAN = 'free';

export default function PremiumGuard({ children, feature = 'esta funcionalidade' }: PremiumGuardProps) {
  const { user } = useAuth();

  const isPremiumPlan = user && user.plan !== FREE_PLAN;
  const hasTemporaryAccess = Boolean(
    user?.access &&
    !user.access.blocked &&
    (user.access.type === 'trial' || user.access.type === 'grace' || user.access.type === 'premium')
  );

  if (isPremiumPlan || hasTemporaryAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[60vh] flex flex-col">
      {/* Blurred preview */}
      <div className="flex-1 overflow-hidden select-none pointer-events-none opacity-30 blur-sm">
        {children}
      </div>

      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-app-bg/70 backdrop-blur-sm z-10">
        <div className="text-center max-w-md mx-auto px-6 py-10 bg-app-card border border-app-border rounded-2xl shadow-2xl">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600/30 to-primary-800/30 border border-primary-500/30 flex items-center justify-center mx-auto mb-5">
            <Lock size={28} className="text-primary-400" />
          </div>

          <h2 className="text-white text-2xl font-bold mb-2">
            Recurso Premium
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            <span className="text-primary-400 font-medium capitalize">{feature}</span> está disponível apenas para assinantes. Desbloqueie tudo a partir de{' '}
            <span className="text-white font-semibold">R$49,90/mês</span>.
          </p>

          {/* Benefits */}
          <ul className="text-left space-y-2 mb-7">
            {[
              'Planner Kanban ilimitado',
              'Flashcards com IA e revisão espaçada',
              'Cronograma automático',
              'Análises e estatísticas completas',
              'Simulador cognitivo com IA',
            ].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-gray-300">
                <Sparkles size={14} className="text-primary-400 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            to="/app/upgrade"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-semibold text-sm transition-all shadow-lg shadow-primary-900/40"
          >
            <Zap size={16} />
            Ver planos e assinar
          </Link>

          <p className="text-gray-600 text-xs mt-3">Cancele quando quiser • Sem taxa de adesão</p>
        </div>
      </div>
    </div>
  );
}
