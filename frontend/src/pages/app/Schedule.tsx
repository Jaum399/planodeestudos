import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { scheduleApi } from '../../services/api';
import type { ScheduleItem } from '../../types';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const COLORS = [
  '#7c3aed', '#6d28d9', '#4f46e5', '#0891b2',
  '#059669', '#d97706', '#dc2626', '#db2777',
];

const TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

interface FormData {
  day_of_week: number;
  subject: string;
  duration_minutes: number;
  time_slot: string;
  color: string;
}

const emptyForm: FormData = { day_of_week: 1, subject: '', duration_minutes: 60, time_slot: '08:00', color: '#7c3aed' };

export default function Schedule() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await scheduleApi.getAll();
      setItems(data.items);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalWeeklyMinutes = items.reduce((s, i) => s + i.duration_minutes, 0);

  const openCreate = (dayIndex?: number) => {
    setForm({ ...emptyForm, day_of_week: dayIndex ?? 1 });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.subject.trim()) {
      setError('Matéria é obrigatória.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await scheduleApi.create(form);
      setItems(prev => [...prev, data.item]);
      setShowModal(false);
    } catch {
      setError('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await scheduleApi.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      //
    }
  };

  const getItemsForDay = (day: number) =>
    items.filter(i => i.day_of_week === day).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const getDayTotal = (day: number) =>
    getItemsForDay(day).reduce((s, i) => s + i.duration_minutes, 0);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h${m}m`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cronograma Semanal</h1>
          <p className="text-gray-400 text-sm mt-1">
            Total: {formatDuration(totalWeeklyMinutes)} planejados esta semana
          </p>
        </div>
        <button onClick={() => openCreate()} className="btn-primary text-sm py-2.5">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
            const dayItems = getItemsForDay(dayIdx);
            const total = getDayTotal(dayIdx);
            const isToday = new Date().getDay() === dayIdx;

            return (
              <div
                key={dayIdx}
                className={`rounded-2xl border p-3 min-h-[160px] ${
                  isToday
                    ? 'border-primary-600/50 bg-primary-600/5'
                    : 'border-app-border bg-app-surface/30'
                }`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={`text-xs font-bold ${isToday ? 'text-primary-300' : 'text-gray-300'}`}>
                      {DAYS[dayIdx]}
                      {isToday && <span className="ml-1 text-primary-400">•</span>}
                    </p>
                    {total > 0 && (
                      <p className="text-[10px] text-gray-600">{formatDuration(total)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => openCreate(dayIdx)}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-primary-600/20 text-gray-500 hover:text-primary-400 transition-all flex items-center justify-center"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {dayItems.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl p-2.5 group relative"
                      style={{ background: `${item.color}20`, borderLeft: `3px solid ${item.color}` }}
                    >
                      <p className="text-white text-xs font-medium leading-tight">{item.subject}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400">{item.time_slot} · {formatDuration(item.duration_minutes)}</span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {dayItems.length === 0 && (
                    <p className="text-gray-700 text-[10px] text-center py-3">Livre</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly summary */}
      {items.length > 0 && (
        <div className="card-glass rounded-2xl p-5 card-glow">
          <h3 className="text-white font-semibold mb-4">Resumo por dia</h3>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
              const total = getDayTotal(dayIdx);
              const maxTotal = Math.max(...[1,2,3,4,5,6,0].map(getDayTotal), 1);
              const pct = Math.round((total / maxTotal) * 100);
              return (
                <div key={dayIdx} className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs w-8">{DAYS[dayIdx]}</span>
                  <div className="flex-1 bg-app-bg rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-700 to-primary-400 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-gray-500 text-xs w-14 text-right">{total > 0 ? formatDuration(total) : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-md card-glow animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Adicionar ao Cronograma</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Dia da Semana</label>
                <select
                  className="input-field"
                  value={form.day_of_week}
                  onChange={e => setForm(p => ({ ...p, day_of_week: +e.target.value }))}
                >
                  {DAYS_FULL.map((d, i) => (
                    <option key={i} value={i} className="bg-app-card">{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Matéria *</label>
                <input
                  className="input-field"
                  placeholder="Ex: Cardiologia"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Horário</label>
                  <select className="input-field" value={form.time_slot} onChange={e => setForm(p => ({ ...p, time_slot: e.target.value }))}>
                    {TIMES.map(t => <option key={t} value={t} className="bg-app-card">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Duração</label>
                  <select className="input-field" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: +e.target.value }))}>
                    {[15,30,45,60,90,120,150,180].map(d => (
                      <option key={d} value={d} className="bg-app-card">{d >= 60 ? `${d/60}h${d%60 ? d%60+'m' : ''}` : `${d}m`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center py-3 text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center py-3 text-sm disabled:opacity-60">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
