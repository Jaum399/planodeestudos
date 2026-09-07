import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { goalsApi } from '../../services/api';

interface Goal {
  _id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  status: string;
  created_at: string;
}

export default function GoalsManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    goal_name: '',
    goal_type: 'daily',
    target_value: 10,
    target_unit: 'cards',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await goalsApi.list();
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await goalsApi.update(editingId, formData);
      } else {
        await goalsApi.create(formData);
      }
      setFormData({ goal_name: '', goal_type: 'daily', target_value: 10, target_unit: 'cards' });
      setShowForm(false);
      setEditingId(null);
      loadGoals();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Tem certeza que deseja remover essa meta?')) {
      try {
        await goalsApi.delete(goalId);
        loadGoals();
      } catch (error) {
        console.error('Failed to delete goal:', error);
      }
    }
  };

  const handleEdit = (goal: Goal) => {
    setFormData({
      goal_name: goal.goal_name,
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      target_unit: goal.target_unit,
    });
    setEditingId(goal._id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ goal_name: '', goal_type: 'daily', target_value: 10, target_unit: 'cards' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Minhas Metas</h1>
            <p className="text-gray-400">Defina e acompanhe suas metas de estudo diárias</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary-500/50 transition-all"
            >
              <Plus size={20} />
              Nova Meta
            </button>
          )}
        </div>

        {showForm && (
          <div className="card-glass mb-6 p-6 rounded-lg border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? 'Editar Meta' : 'Criar Nova Meta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Meta</label>
                <input
                  type="text"
                  value={formData.goal_name}
                  onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                  placeholder="Ex: Revisar 20 cards"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                  <select
                    value={formData.goal_type}
                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Unidade</label>
                  <select
                    value={formData.target_unit}
                    onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="cards">Cards</option>
                    <option value="minutes">Minutos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Meta</label>
                <input
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })}
                  min="1"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-primary-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary-500/50 transition-all font-medium"
                >
                  {editingId ? 'Atualizar Meta' : 'Criar Meta'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-all font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="card-glass p-8 rounded-lg border border-white/10 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhuma meta criada</h3>
            <p className="text-gray-400 mb-4">Crie sua primeira meta de estudo para começar a acompanhar seu progresso</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary-500/50 transition-all"
            >
              <Plus size={20} />
              Criar Meta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal._id}
                className="card-glass p-4 rounded-lg border border-white/10 flex items-center justify-between hover:border-primary-500/50 transition-all"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{goal.goal_name}</h3>
                  <p className="text-sm text-gray-400">
                    {goal.target_value} {goal.target_unit === 'cards' ? 'cards' : 'minutos'} · {goal.goal_type === 'daily' ? 'Diária' : goal.goal_type === 'weekly' ? 'Semanal' : 'Mensal'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(goal)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                    title="Editar meta"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(goal._id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Remover meta"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
