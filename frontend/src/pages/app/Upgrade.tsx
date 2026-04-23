import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Shield, ArrowLeft, Loader2, Zap, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi, paymentApi } from '../../services/api';
import PublicPreferenceControls from '../../components/PublicPreferenceControls';

type PlanType = 'standard';

const PLAN_PRICE = '49,90';

const FEATURES = [
  'Planner Kanban ilimitado',
  'Flashcards com revisão espaçada (SM-2)',
  'Simulador cognitivo com IA',
  'Cronograma automático personalizado',
  'Análises e estatísticas detalhadas',
  'Suporte prioritário',
];

function isValidCpf(doc: string): boolean {
  const value = doc.replace(/\D/g, '');
  if (value.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(value)) return false;

  const calc = (base: string, factor: number) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) total += Number(base[i]) * (factor - i);
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(value.slice(0, 9), 10);
  const d2 = calc(value.slice(0, 10), 11);
  return d1 === Number(value[9]) && d2 === Number(value[10]);
}

function isValidCnpj(doc: string): boolean {
  const value = doc.replace(/\D/g, '');
  if (value.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(value)) return false;

  const calc = (base: string, factors: number[]) => {
    let total = 0;
    for (let i = 0; i < factors.length; i += 1) {
      total += Number(base[i]) * factors[i];
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calc(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(value.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(value[12]) && d2 === Number(value[13]);
}

function isValidBillingDocument(doc: string): boolean {
  const value = doc.replace(/\D/g, '');
  if (value.length === 11) return isValidCpf(value);
  if (value.length === 14) return isValidCnpj(value);
  return false;
}

export default function Upgrade() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billingDocument, setBillingDocument] = useState((user?.billingDocument || '').replace(/\D/g, ''));

  const isPremium = user && user.plan !== 'free';

  async function handleSubscribe() {
    const planType: PlanType = 'standard';
    setLoading(true);
    setError('');
    try {
      const cleanDoc = billingDocument.replace(/\D/g, '');
      if (!isValidBillingDocument(cleanDoc)) {
        setError('Informe um CPF/CNPJ válido para gerar o checkout.');
        return;
      }

      if (user?.plan === 'premium') {
        setError('Seu plano Premium já está ativo.');
        return;
      }

      if (cleanDoc !== (user?.billingDocument || '').replace(/\D/g, '')) {
        const profileRes = await authApi.updateMe({ billingDocument: cleanDoc });
        if (profileRes.data?.user) updateUser(profileRes.data.user);
      }

      const res = await paymentApi.createCheckout(planType);
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setError('Erro ao iniciar checkout. Tente novamente.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.error || 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.getPortal();
      if (res.data.portal_url) {
        window.location.href = res.data.portal_url;
      }
    } catch {
      setError('Erro ao abrir portal de assinatura.');
    } finally {
      setLoading(false);
    }
  }

  if (isPremium) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mb-5">
          <Crown size={32} className="text-primary-400" />
        </div>
        <h2 className="text-white text-2xl font-bold public-heading mb-2">Você já tem o plano Premium!</h2>
        <p className="text-gray-400 mb-6">
          Plano ativo: <span className="text-primary-400 font-semibold capitalize">Premium</span>
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/app/dashboard')} className="btn-primary">
            Ir para o Dashboard
          </button>
          <button
            onClick={handlePortal}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-app-border text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
            Gerenciar assinatura
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-white text-2xl font-bold public-heading">Assine o Premium</h1>
            <p className="text-gray-400 text-sm public-subheading">Plano Premium: R$49,90/mês</p>
          </div>
        </div>
        <PublicPreferenceControls compact />
      </div>

      {/* Plan card */}
      <div className="bg-app-card border border-primary-500/40 rounded-2xl p-8 ring-1 ring-primary-500/20 mb-6">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-primary-800">
            PLANO MENSAL
          </span>
        </div>

        {/* Price */}
        <div className="text-center mb-8">
          <div className="flex items-end justify-center gap-1">
            <span className="text-gray-400 text-lg font-medium mb-1">R$</span>
            <span className="text-white text-6xl font-extrabold leading-none">{PLAN_PRICE.split(',')[0]}</span>
            <span className="text-white text-3xl font-bold mb-1">,{PLAN_PRICE.split(',')[1]}</span>
          </div>
          <p className="text-gray-500 text-sm mt-2">por mês • Cancele quando quiser</p>
        </div>

        {/* Features */}
        <div className="border-t border-app-border pt-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-primary-400" />
            <span className="text-gray-300 text-sm font-semibold">Tudo incluso no plano:</span>
          </div>
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-green-400" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mb-4">
          <label className="block text-gray-400 text-xs font-medium mb-1.5">CPF ou CNPJ para cobrança</label>
          <input
            type="text"
            value={billingDocument}
            onChange={(e) => setBillingDocument(e.target.value.replace(/\D/g, ''))}
            placeholder="Somente números"
            className="input-field"
            maxLength={14}
            disabled={loading}
          />
          <p className="text-gray-600 text-xs mt-1">Obrigatório para o Asaas gerar boleto/PIX/cartão.</p>
        </div>

        <button
          onClick={() => handleSubscribe()}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-white text-base bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-900/30"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Redirecionando...</>
          ) : (
            <><Zap size={18} /> Assinar agora — R${PLAN_PRICE}/mês</>
          )}
        </button>

        {error && (
          <p className="text-red-400 text-sm text-center mt-3">{error}</p>
        )}

        <p className="text-gray-600 text-xs text-center mt-4">
          Pagamento seguro via Asaas • Premium liberado após confirmação do pagamento
        </p>
      </div>
    </div>
  );
}
