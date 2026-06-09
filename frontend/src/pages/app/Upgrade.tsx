import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Shield, ArrowLeft, Loader2, Zap, ExternalLink, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authApi, paymentApi } from '../../services/api';
import PublicPreferenceControls from '../../components/PublicPreferenceControls';
import { formatCpfOrCnpj, onlyDigits, safeReadJson } from '../../utils/formAutomation';

type PlanType = 'standard' | 'premium' | 'premium_medhub';

interface Plan {
  id: PlanType;
  name: string;
  price: string;
  displayPrice: number;
  description: string;
  featured?: boolean;
  features: string[];
  comingSoon?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'standard',
    name: 'Básico',
    price: '50,00',
    displayPrice: 50,
    description: 'Perfeito para começar',
    features: [
      'Planner Kanban',
      'Flashcards com revisão espaçada (SM-2)',
      'Até 500 cards',
      'Análises básicas',
      'Suporte por email',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '75,00',
    displayPrice: 75,
    description: 'Mais econômico',
    featured: true,
    features: [
      'Tudo do Básico, plus:',
      'Cards ilimitados',
      'Simulador cognitivo com IA',
      'Cronograma automático personalizado',
      'Análises e estatísticas detalhadas',
      'Suporte prioritário',
    ],
  },
  {
    id: 'premium_medhub',
    name: 'Premium+',
    price: '120,00',
    displayPrice: 120,
    description: 'Completo com MedHub',
    features: [
      'Tudo do Premium, plus:',
      'Acesso ao Centro Médico',
      'Comunidade MedHub',
      'Recursos avançados de coaching',
      'Integração com especialistas',
      'Prioridade máxima de suporte',
    ],
  },
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
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('premium');
  const [error, setError] = useState('');
  const [billingDocument, setBillingDocument] = useState(() => {
    const fromUser = user?.billingDocument || '';
    if (fromUser) return formatCpfOrCnpj(fromUser);
    const draft = safeReadJson<{ cpf?: string }>('ordex.register.draft', {});
    if (draft.cpf) return formatCpfOrCnpj(draft.cpf || '');
    return formatCpfOrCnpj(localStorage.getItem('ordex.upgrade.lastBillingDocument') || '');
  });

  const isPremium = user && user.plan !== 'free';

  useEffect(() => {
    localStorage.setItem('ordex.upgrade.lastBillingDocument', onlyDigits(billingDocument));
  }, [billingDocument]);

  async function handleSubscribe() {
    setLoading(true);
    setError('');
    try {
      const cleanDoc = onlyDigits(billingDocument);
      if (!isValidBillingDocument(cleanDoc)) {
        setError('Informe um CPF/CNPJ válido para gerar o checkout.');
        return;
      }

      if (cleanDoc !== (user?.billingDocument || '').replace(/\D/g, '')) {
        const profileRes = await authApi.updateMe({ billingDocument: cleanDoc });
        if (profileRes.data?.user) updateUser(profileRes.data.user);
      }

      const res = await paymentApi.createCheckout(selectedPlan);
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
        <h2 className="text-white text-2xl font-bold public-heading mb-2">Você já tem um plano Premium!</h2>
        <p className="text-gray-400 mb-6">
          Plano ativo: <span className="text-primary-400 font-semibold capitalize">{user?.plan}</span>
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

  const selectedPlanObj = PLANS.find(p => p.id === selectedPlan)!;

  return (
    <div className="max-w-6xl mx-auto">
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
            <h1 className="text-white text-2xl font-bold public-heading">Escolha seu plano</h1>
            <p className="text-gray-400 text-sm public-subheading">Acesso ilimitado ao que você precisa</p>
          </div>
        </div>
        <PublicPreferenceControls compact />
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id as PlanType)}
            disabled={loading}
            className={`text-left rounded-2xl p-6 border transition-all ${
              selectedPlan === plan.id
                ? 'bg-app-card border-primary-500/50 ring-2 ring-primary-500/30'
                : 'bg-app-card border-app-border hover:border-primary-500/30'
            } ${plan.featured ? 'md:scale-105 md:z-10' : ''} disabled:opacity-50`}
          >
            {/* Featured badge */}
            {plan.featured && (
              <div className="flex items-center gap-1.5 mb-3">
                <Star size={14} className="text-primary-400 fill-primary-400" />
                <span className="text-xs font-bold text-primary-400">MAIS POPULAR</span>
              </div>
            )}

            {/* Plan name */}
            <h3 className="text-white text-lg font-bold mb-1">{plan.name}</h3>
            <p className="text-gray-400 text-xs mb-4">{plan.description}</p>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-end gap-0.5">
                <span className="text-gray-400 text-xs font-medium">R$</span>
                <span className="text-white text-4xl font-extrabold">{plan.price.split(',')[0]}</span>
                <span className="text-gray-400 text-base font-semibold">,{plan.price.split(',')[1]}</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">por mês</p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <Check size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* Selection indicator */}
            {selectedPlan === plan.id && (
              <div className="mt-6 py-2 rounded-lg bg-primary-600/20 border border-primary-500/30 text-center">
                <span className="text-xs font-semibold text-primary-400">Selecionado</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Billing form */}
      <div className="max-w-lg mx-auto bg-app-card border border-app-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-primary-400" />
          <h3 className="text-white font-bold">Informações de cobrança</h3>
        </div>

        <label className="block text-gray-400 text-xs font-medium mb-1.5">CPF ou CNPJ</label>
        <input
          type="text"
          value={billingDocument}
          onChange={(e) => setBillingDocument(formatCpfOrCnpj(e.target.value))}
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          className="input-field mb-4"
          maxLength={18}
          disabled={loading}
        />
        <p className="text-gray-600 text-xs mb-6">Obrigatório para o Asaas gerar boleto/PIX/cartão.</p>

        <button
          onClick={() => handleSubscribe()}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-white text-base bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-900/30 mb-3"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Redirecionando...</>
          ) : (
            <><Zap size={18} /> Assinar {selectedPlanObj.name} — R${selectedPlanObj.price}/mês</>
          )}
        </button>

        {error && (
          <p className="text-red-400 text-sm text-center mb-3">{error}</p>
        )}

        <p className="text-gray-600 text-xs text-center">
          Pagamento seguro via Asaas • Premium liberado após confirmação do pagamento • Cancele quando quiser
        </p>
      </div>
    </div>
  );
}
