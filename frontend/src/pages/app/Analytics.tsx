import { useEffect, useState } from 'react';
import { analyticsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import type { AnalyticsData } from '../../types';
import { Flame, Clock, Target, CheckCircle, BookOpen, TrendingUp, Plus, X } from 'lucide-react';

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [logForm, setLogForm] = useState({ subject: '', duration_minutes: 60, correct_answers: 0, total_questions: 0 });
  const [logLoading, setLogLoading] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  const load = async () => {
    try {
      const { data: d } = await analyticsApi.getSummary();
      setData(d);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const weeklyGoal = user?.weekly_goal_hours || 20;
  const weeklyHours = data ? Math.round((data.weeklyMinutes || 0) / 60) : 0;
  const weeklyPct = Math.min(100, Math.round((weeklyHours / weeklyGoal) * 100));

  const handleLogSession = async () => {
    if (!logForm.subject.trim()) return;
    setLogLoading(true);
    try {
      await analyticsApi.logSession(logForm);
      setLogSuccess(true);
      setShowLog(false);
      setLogForm({ subject: '', duration_minutes: 60, correct_answers: 0, total_questions: 0 });
      setTimeout(() => setLogSuccess(false), 3000);
      load();
    } catch {
      //
    } finally {
      setLogLoading(false);
    }
  };

  const getDailyData = () => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    if (data) {
      data.last7Days.forEach(s => {
        if (days[s.session_date] !== undefined) days[s.session_date] = s.total_minutes;
      });
    }
    return Object.entries(days).map(([date, mins]) => ({
      date,
      mins,
      label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
    }));
  };

  const dailyData = getDailyData();
  const maxMins = Math.max(...dailyData.map(d => d.mins), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Análises Visuais</h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe sua evolução em cada detalhe</p>
        </div>
        <button onClick={() => setShowLog(true)} className="btn-primary text-sm py-2.5">
          <Plus size={16} /> Registrar sessão
        </button>
      </div>

      {logSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle size={15} /> Sessão registrada com sucesso!
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : data && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-orange-500/10 rounded-xl">
                  <Flame size={16} className="text-orange-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-white">{data.streak}</p>
              <p className="text-gray-500 text-xs mt-1">dias seguidos</p>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-primary-600/10 rounded-xl">
                  <Clock size={16} className="text-primary-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-white">{weeklyHours}h</p>
              <p className="text-gray-500 text-xs mt-1">esta semana</p>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <CheckCircle size={16} className="text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-white">{data.plannerStats?.done ?? 0}</p>
              <p className="text-gray-500 text-xs mt-1">tarefas feitas</p>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                  <BookOpen size={16} className="text-violet-400" />
                </div>
              </div>
              <p className="text-3xl font-black text-white">{data.flashcardStats?.total_reviews ?? 0}</p>
              <p className="text-gray-500 text-xs mt-1">revisões feitas</p>
            </div>
          </div>

          {/* Chart - hours per day */}
          <div className="card-glass rounded-2xl p-6 card-glow">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold">Horas de Estudo</h3>
                <p className="text-gray-500 text-xs">Últimos 7 dias</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">{weeklyHours}h</p>
                <p className="text-gray-500 text-xs">/ {weeklyGoal}h meta</p>
              </div>
            </div>
            <div className="flex items-end gap-2 h-28">
              {dailyData.map(({ date, mins, label }) => {
                const pct = Math.round((mins / maxMins) * 100);
                const isToday = date === new Date().toISOString().split('T')[0];
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                      <div
                        className={`w-full rounded-t-lg transition-all duration-700 ${isToday ? 'bg-gradient-to-t from-primary-700 to-primary-400' : 'bg-primary-600/30'}`}
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        title={`${Math.round(mins / 60)}h ${mins % 60}m`}
                      />
                    </div>
                    <span className={`text-[10px] ${isToday ? 'text-primary-400 font-bold' : 'text-gray-600'}`}>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Weekly progress */}
            <div className="mt-5 pt-5 border-t border-app-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Meta semanal</span>
                <span className="text-primary-400 font-semibold">{weeklyPct}%</span>
              </div>
              <div className="w-full bg-app-bg rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-primary-700 to-primary-400 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${weeklyPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Planner stats */}
          {data.plannerStats && (
            <div className="card-glass rounded-2xl p-6 card-glow">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Target size={16} className="text-primary-400" /> Progresso do Planner
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total', value: data.plannerStats.total, color: 'text-gray-300' },
                  { label: 'Em andamento', value: data.plannerStats.in_progress, color: 'text-yellow-400' },
                  { label: 'Concluído', value: data.plannerStats.done, color: 'text-emerald-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center bg-app-bg/50 rounded-xl p-4">
                    <p className={`text-2xl font-black ${color}`}>{value ?? 0}</p>
                    <p className="text-gray-600 text-xs mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {data.plannerStats.total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Conclusão</span>
                    <span>{Math.round(((data.plannerStats.done ?? 0) / data.plannerStats.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-app-bg rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-700 to-emerald-400 h-2 rounded-full"
                      style={{ width: `${Math.round(((data.plannerStats.done ?? 0) / data.plannerStats.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accuracy by subject */}
          {data.subjectAccuracy && data.subjectAccuracy.length > 0 && (
            <div className="card-glass rounded-2xl p-6 card-glow">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-400" /> Taxa de Acertos por Matéria
              </h3>
              <div className="space-y-3">
                {data.subjectAccuracy.map(s => (
                  <div key={s.subject}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-300">{s.subject}</span>
                      <span className={s.accuracy >= 70 ? 'text-emerald-400' : s.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                        {s.accuracy ?? 0}% ({s.correct}/{s.total})
                      </span>
                    </div>
                    <div className="w-full bg-app-bg rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${s.accuracy >= 70 ? 'bg-gradient-to-r from-emerald-700 to-emerald-400' : s.accuracy >= 50 ? 'bg-gradient-to-r from-yellow-700 to-yellow-400' : 'bg-gradient-to-r from-red-800 to-red-500'}`}
                        style={{ width: `${s.accuracy ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.subjectAccuracy?.length === 0 && data.last7Days?.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Registre sessões de estudo para ver análises aqui.</p>
              <button onClick={() => setShowLog(true)} className="btn-primary text-sm py-2 px-5 mt-4">
                <Plus size={14} /> Registrar primeira sessão
              </button>
            </div>
          )}
        </>
      )}

      {/* Log session modal */}
      {showLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-md card-glow animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Registrar Sessão de Estudo</h3>
              <button onClick={() => setShowLog(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Matéria *</label>
                <input className="input-field" placeholder="Ex: Cardiologia" value={logForm.subject} onChange={e => setLogForm(p => ({ ...p, subject: e.target.value }))} />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Duração (minutos)</label>
                <input type="number" className="input-field" min="1" value={logForm.duration_minutes} onChange={e => setLogForm(p => ({ ...p, duration_minutes: +e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Acertos</label>
                  <input type="number" className="input-field" min="0" value={logForm.correct_answers} onChange={e => setLogForm(p => ({ ...p, correct_answers: +e.target.value }))} />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Total de questões</label>
                  <input type="number" className="input-field" min="0" value={logForm.total_questions} onChange={e => setLogForm(p => ({ ...p, total_questions: +e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowLog(false)} className="btn-secondary flex-1 justify-center py-3 text-sm">Cancelar</button>
              <button onClick={handleLogSession} disabled={logLoading} className="btn-primary flex-1 justify-center py-3 text-sm disabled:opacity-60">
                {logLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
