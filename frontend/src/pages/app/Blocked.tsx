import { useState } from 'react';
import { Lock, CreditCard, Loader2, Zap } from 'lucide-react';
import { paymentApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Blocked() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reason = user?.access?.reason;

  async function handleSubscribe() {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.createCheckout();
      if (res.data.checkout_url) window.location.href = res.data.checkout_url;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <Lock size={36} className="text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {reason === 'payment_required' ? 'Pagamento necessário' : 'Acesso suspenso'}
        </h1>

        <p className="text-gray-400 mb-8">
          {reason === 'payment_required'
            ? 'Sua conta foi criada com sucesso, mas o acesso é liberado apenas após confirmação do pagamento.'
            : 'Seu pagamento está em atraso há mais de 3 dias. Regularize para reativar o acesso imediatamente.'}
        </p>

        {/* Plan card */}
        <div className="bg-app-card border border-primary-500/40 rounded-2xl p-6 mb-6 text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-bold text-lg">Plano Mensal</p>
              <p className="text-gray-400 text-sm">Acesso completo a todos os recursos</p>
            </div>
            <div className="text-right">
              <p className="text-primary-400 font-bold text-2xl">R$19,90</p>
              <p className="text-gray-500 text-xs">/mês</p>
            </div>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              'Planner Kanban ilimitado',
              'Flashcards com revisão espaçada',
              'JARVIS — assistente IA por voz',
              'Mapa Mental Evolutivo',
              'Cronograma automático',
              'Análises e estatísticas completas',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <Zap size={13} className="text-primary-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            {reason === 'payment_required' ? 'Assinar agora — R$19,90/mês' : 'Regularizar pagamento'}
          </button>

          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
        </div>

        <p className="text-gray-600 text-xs">
          Pagamento seguro via Asaas. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}
