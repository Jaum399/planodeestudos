import { useEffect, useState } from 'react';
import { DollarSign, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PlanPrice {
  type: string;
  name: string;
  price: number;
  loading: boolean;
}

export default function AdminPricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanPrice[]>([
    { type: 'standard', name: 'Plano Premium', price: 19.90, loading: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Verificar se é admin
  useEffect(() => {
    const ADMIN_USERS = (process.env.REACT_APP_ADMIN_USERS || '').split(',');
    if (!user || !ADMIN_USERS.includes(user._id)) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  // Carregar preços atuais
  useEffect(() => {
    fetchCurrentPrices();
  }, []);

  const fetchCurrentPrices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Falha ao carregar preços');

      const data = await res.json();
      const { plans: plansData } = data;

      setPlans([{ type: 'standard', name: 'Plano Premium', price: 19.90, loading: false }]);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage('Erro ao carregar preços: ' + (err instanceof Error ? err.message : 'erro desconhecido'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (index: number, newPrice: string) => {
    const updatedPlans = [...plans];
    updatedPlans[index].price = parseFloat(newPrice) || 0;
    setPlans(updatedPlans);
  };

  const handleSavePrice = async (index: number) => {
    try {
      const plan = plans[index];
      const updatedPlans = [...plans];
      updatedPlans[index].loading = true;
      setPlans(updatedPlans);

      const res = await fetch(`/api/admin/plans/${plan.type}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: plan.price }),
      });

      if (!res.ok) throw new Error('Falha ao atualizar preço');

      setSuccessMessage(`${plan.name} atualizado para R$ ${plan.price.toFixed(2)}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setErrorMessage('Erro ao salvar: ' + (err instanceof Error ? err.message : 'erro desconhecido'));
    } finally {
      const updatedPlans = [...plans];
      updatedPlans[index].loading = false;
      setPlans(updatedPlans);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Carregando preços...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <DollarSign size={28} className="text-primary-400" />
          <h1 className="text-3xl font-bold text-white">Gerenciar Preços dos Planos</h1>
        </div>
        <p className="text-gray-400">Atualize os valores dos planos em tempo real</p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle size={20} className="text-green-400" />
          <span className="text-green-300">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle size={20} className="text-red-400" />
          <span className="text-red-300">{errorMessage}</span>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid gap-6">
        {plans.map((plan, index) => (
          <div
            key={plan.type}
            className="card-glass rounded-xl p-6 border border-app-border hover:border-primary-500/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-gray-400 mt-1">Preço mensal</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary-400">R$ {plan.price.toFixed(2)}</div>
              </div>
            </div>

            {/* Price Input */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Novo Valor (R$)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={plan.price}
                  onChange={(e) => handlePriceChange(index, e.target.value)}
                  className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-lg text-white focus:outline-none focus:border-primary-500"
                  disabled={plan.loading}
                />
              </div>

              <button
                onClick={() => handleSavePrice(index)}
                disabled={plan.loading}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                {plan.loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          ℹ️ As alterações entram em vigor imediatamente. Todos os novos clientes verão os preços atualizados.
        </p>
      </div>
    </div>
  );
}
