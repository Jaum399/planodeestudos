import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock3, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi, paymentApi } from '../../services/api';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'pending' | 'success' | 'error'>('loading');

  useEffect(() => {
    let isMounted = true;

    // Premium so ativa quando status de pagamento estiver realmente confirmado.
    async function syncStatus() {
      try {
        const maxAttempts = 6;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const [statusRes, meRes] = await Promise.all([paymentApi.getStatus(), authApi.me()]);

          if (!isMounted) return;

          if (meRes.data?.user) {
            updateUser(meRes.data.user);
          }

          const plan = statusRes.data?.plan || '';
          const isAnyPremiumPlan = plan !== 'free' && plan !== '' && statusRes.data?.subscriptionStatus === 'active';
          if (isAnyPremiumPlan) {
            setStatus('success');
            return;
          }

          setStatus('pending');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (isMounted) {
          setStatus('pending');
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    syncStatus();
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => navigate('/app/dashboard'), 2500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      {status === 'loading' ? (
        <>
          <Loader2 size={48} className="text-primary-400 animate-spin mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Processando pagamento...</h2>
          <p className="text-gray-400 text-sm">Estamos aguardando a confirmação do Asaas</p>
        </>
      ) : status === 'pending' ? (
        <>
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center mb-6">
            <Clock3 size={46} className="text-amber-400" />
          </div>
          <h2 className="text-white text-3xl font-extrabold mb-3">Pagamento em análise</h2>
          <p className="text-gray-300 text-base mb-2">
            Seu plano premium será ativado automaticamente após a confirmação do pagamento.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Você pode voltar ao painel agora. Assim que confirmar, o acesso premium será liberado.
          </p>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="btn-primary text-base px-8 py-3"
          >
            Voltar ao Dashboard
          </button>
        </>
      ) : status === 'error' ? (
        <>
          <h2 className="text-white text-2xl font-bold mb-2">Nao foi possivel confirmar agora</h2>
          <p className="text-gray-400 text-sm mb-6">
            Tente novamente em alguns minutos. Seu acesso premium so sera liberado apos o pagamento confirmado.
          </p>
          <button
            onClick={() => navigate('/app/upgrade')}
            className="btn-primary text-base px-8 py-3"
          >
            Voltar para Assinatura
          </button>
        </>
      ) : (
        <>
          <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mb-6">
            <CheckCircle size={48} className="text-green-400" />
          </div>
          <h2 className="text-white text-3xl font-extrabold mb-3">Pagamento confirmado!</h2>
          <p className="text-gray-300 text-base mb-2">
            Bem-vindo ao <span className="text-primary-400 font-bold">Ordex Premium</span>!
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Todas as funcionalidades foram desbloqueadas para você.
          </p>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="btn-primary text-base px-8 py-3"
          >
            Ir para o Dashboard
          </button>
          <p className="text-gray-600 text-xs mt-4">Redirecionando automaticamente...</p>
        </>
      )}
    </div>
  );
}
