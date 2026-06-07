import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { plannerApi } from '../../services/api';
import type { PlannerItem } from '../../types';

const COLUMNS: { key: PlannerItem['status']; label: string; color: string; dot: string }[] = [
  { key: 'todo', label: 'A Fazer', color: 'border-gray-600/40 bg-gray-600/5', dot: 'bg-gray-500' },
  { key: 'in-progress', label: 'Em Andamento', color: 'border-yellow-600/40 bg-yellow-600/5', dot: 'bg-yellow-400' },
  { key: 'done', label: 'Concluído', color: 'border-emerald-600/40 bg-emerald-600/5', dot: 'bg-emerald-400' },
];

const SUBJECTS = [
  'Clínica Médica', 'Cardiologia', 'Pediatria', 'Ginecologia', 'Cirurgia',
  'Direito Constitucional', 'Direito Penal', 'Matemática', 'Português',
  'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Outro',
];

interface FormData {
  title: string;
  subject: string;
  status: PlannerItem['status'];
  difficulty: number;
  notes: string;
}

const emptyForm: FormData = { title: '', subject: '', status: 'todo', difficulty: 5, notes: '' };

export default function Planner() {
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItems = async () => {
    try {
      const { data } = await plannerApi.getAll();
      setItems(data.items);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (item: PlannerItem) => {
    setEditingItem(item);
    setForm({ title: item.title, subject: item.subject, status: item.status, difficulty: item.difficulty, notes: item.notes });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.subject.trim()) {
      setError('Título e matéria são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        const { data } = await plannerApi.update(editingItem.id, form);
        setItems(prev => prev.map(i => i.id === editingItem.id ? data.item : i));
      } else {
        const { data } = await plannerApi.create(form);
        setItems(prev => [data.item, ...prev]);
      }
      setShowModal(false);
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este item?')) return;
    try {
      await plannerApi.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      //
    }
  };

  const moveStatus = async (item: PlannerItem, newStatus: PlannerItem['status']) => {
    try {
      const { data } = await plannerApi.update(item.id, { status: newStatus });
      setItems(prev => prev.map(i => i.id === item.id ? data.item : i));
    } catch {
      //
    }
  };

  const difficultyColor = (d: number) => {
    if (d <= 3) return 'text-emerald-400';
    if (d <= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planner de Estudos</h1>
          <p className="text-gray-400 text-sm mt-1">Organize suas matérias com o sistema Kanban</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm py-2.5">
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {COLUMNS.map(col => {
            const colItems = items.filter(i => i.status === col.key);
            return (
              <div key={col.key} className={`rounded-2xl border ${col.color} p-4`}>
                {/* Column header */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className="text-white font-semibold text-sm">{col.label}</span>
                  <span className="ml-auto text-gray-500 text-xs bg-white/5 rounded-full px-2 py-0.5">
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 min-h-[120px]">
                  {colItems.map(item => (
                    <div key={item.id} className="kanban-card card-glass rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-white text-sm font-medium leading-snug">{item.title}</p>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(item)} className="text-gray-600 hover:text-primary-400 transition-colors p-1">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge bg-primary-600/20 text-primary-300 text-[10px]">{item.subject}</span>
                        <span className={`text-xs ${difficultyColor(item.difficulty)}`}>Dif: {item.difficulty}/10</span>
                      </div>

                      {item.next_review && (
                        <p className="text-gray-600 text-[10px] mt-1.5">Revisão: {new Date(item.next_review + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      )}

                      {/* Move buttons */}
                      <div className="flex gap-1.5 mt-3">
                        {COLUMNS.filter(c => c.key !== col.key).map(c => (
                          <button
                            key={c.key}
                            onClick={() => moveStatus(item, c.key)}
                            className="flex-1 text-[10px] py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {colItems.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-gray-700 text-xs">
                      Nenhuma tarefa aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-md card-glow animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{editingItem ? 'Editar tarefa' : 'Nova tarefa'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Título *</label>
                <input
                  className="input-field"
                  placeholder="Ex: Estudar Cardiologia - Arritmias"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Matéria *</label>
                <input
                  list="subjects-list"
                  className="input-field"
                  placeholder="Digite ou selecione..."
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                />
                <datalist id="subjects-list">
                  {SUBJECTS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Status</label>
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as PlannerItem['status'] }))}
                  >
                    <option value="todo" className="bg-app-card">A Fazer</option>
                    <option value="in-progress" className="bg-app-card">Em Andamento</option>
                    <option value="done" className="bg-app-card">Concluído</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Dificuldade: {form.difficulty}/10</label>
                  <input
                    type="range"
                    min="1" max="10"
                    value={form.difficulty}
                    onChange={e => setForm(p => ({ ...p, difficulty: +e.target.value }))}
                    className="w-full accent-primary-500 mt-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Notas (opcional)</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Observações sobre esta tarefa..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center py-3 text-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center py-3 text-sm disabled:opacity-60">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={15} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
