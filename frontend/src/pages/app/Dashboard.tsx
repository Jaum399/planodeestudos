import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Layers, BookOpen, Calendar, Flame, Target, CheckCircle, Clock, Zap, Lock, Timer, Play, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { analyticsApi, questionBankApi } from '../../services/api';
import type { AnalyticsData } from '../../types';

export default function Dashboard() {
  const { user } = useAuth();
  const { language, t } = usePreferences();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [lastSimulation, setLastSimulation] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary(),
      questionBankApi.getSimulationRanking?.()
    ]).then(([analyticsRes, rankingRes]) => {
      setAnalytics(analyticsRes.data);
      if (rankingRes?.data?.recent?.length > 0) {
        setLastSimulation(rankingRes.data.recent[0]);
      }
    }).catch(() => {});
  }, []);

  const weeklyHours = analytics ? Math.round(analytics.weeklyMinutes / 60) : 0;
  const weeklyGoal = user?.weekly_goal_hours || 20;
  const weeklyProgress = Math.min(100, Math.round((weeklyHours / weeklyGoal) * 100));
  const isPremium = user && user.plan !== 'free';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dash_greeting_morning');
    if (h < 18) return t('dash_greeting_afternoon');
    return t('dash_greeting_evening');
  };

  const getRelativeDate = (dateStr: string): string => {
    const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'hoje';
    return `há ${diffDays} dias`;
  };

  const specialtyEmojis: Record<string, string> = {
    'Medicina': '👨‍⚕️', 'Cardiologia': '❤️', 'Neurologia': '🧠',
    'Pediatria': '👶', 'Cirurgia': '🔪', 'Farmacologia': '💊',
    'Oftalmologia': '👁️', 'Dermatologia': '🩹', 'Residência Médica': '🏥',
    'default': '🏥'
  };

  const getSpecialtyIcon = (area: string): string => specialtyEmojis[area] || specialtyEmojis['default'];

  const phaseConfig = {
    basico: { label: 'Básico', color: 'bg-blue-500/20 text-blue-400' },
    clinico: { label: 'Clínico', color: 'bg-green-500/20 text-green-400' },
    internato: { label: 'Internato', color: 'bg-purple-500/20 text-purple-400' },
    residencia: { label: 'Residência', color: 'bg-rose-500/20 text-rose-400' }
  };

  // Helper: Calculate average accuracy across all subjects
  const getAverageAccuracy = useMemo(() => {
    if (!analytics?.subjectAccuracy?.length) return 0;
    const sum = analytics.subjectAccuracy.reduce((acc, s) => acc + s.accuracy, 0);
    return Math.round(sum / analytics.subjectAccuracy.length);
  }, [analytics?.subjectAccuracy]);

  const localeByLanguage: Record<'pt' | 'en' | 'es' | 'ca', string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    ca: 'ca-ES',
  };
  const activeLocale = localeByLanguage[language] || 'pt-BR';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-400 mt-1">{t('dash_summary_subtitle')}</p>
      </div>

      {/* Upgrade banner for free users */}
      {!isPremium && (
        <Link
          to="/app/upgrade"
          className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary-600/20 via-primary-700/10 to-transparent border border-primary-500/30 hover:border-primary-500/60 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-600/30 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">{t('dash_unlock_features')}</p>
            <p className="text-gray-400 text-xs">{t('dash_unlock_desc')} <span className="text-primary-400 font-medium">R$49,90/mês</span></p>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary-400 font-semibold shrink-0 group-hover:translate-x-1 transition-transform">
            {t('dash_subscribe')} <Zap size={12} />
          </div>
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-500/10 rounded-xl">
              <Flame size={18} className="text-orange-400" />
            </div>
            <span className="text-orange-400 text-xs font-semibold">🔥 Sequência</span>
          </div>
          <p className="text-3xl font-black text-white">{analytics?.streak ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">{t('dash_streak_days')}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-primary-600/10 rounded-xl">
              <Target size={18} className="text-primary-400" />
            </div>
            <span className="text-primary-400 text-xs font-semibold">🎯 Progresso</span>
          </div>
          <p className="text-3xl font-black text-white">{weeklyProgress}%</p>
          <p className="text-gray-500 text-xs mt-1">{weeklyHours}h / {weeklyGoal}h</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <CheckCircle size={18} className="text-emerald-400" />
            </div>
            <span className="text-emerald-400 text-xs font-semibold">✅ Revisões</span>
          </div>
          <p className="text-3xl font-black text-white">{analytics?.plannerStats?.done ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">{t('dash_tasks_completed')}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-violet-500/10 rounded-xl">
              <BookOpen size={18} className="text-violet-400" />
            </div>
            <span className="text-violet-400 text-xs font-semibold">📚 Aprendizagem</span>
          </div>
          <p className="text-3xl font-black text-white">{analytics?.flashcardStats?.total ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">{t('dash_created')}</p>
        </div>

        {/* Acurácia Geral */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Target size={18} className="text-cyan-400" />
            </div>
            <span className="text-cyan-400 text-xs font-semibold">🎯 Desempenho</span>
          </div>
          <p className="text-3xl font-black text-white">{getAverageAccuracy}%</p>
          <p className="text-gray-500 text-xs mt-1">Acurácia média</p>
        </div>

        {/* Última Simulação */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <TrendingUp size={18} className="text-rose-400" />
            </div>
            <span className="text-rose-400 text-xs font-semibold">📊 Última Quiz</span>
          </div>
          <p className="text-3xl font-black text-white">
            {lastSimulation ? `${lastSimulation.correct_answers}/${lastSimulation.total_questions}` : '-'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {lastSimulation ? `${lastSimulation.accuracy}% ${getRelativeDate(lastSimulation.created_at)}` : 'Dados da simulação'}
          </p>
        </div>
      </div>

      {/* Weekly progress bar */}
      <div className="card-glass rounded-2xl p-6 card-glow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold">{t('dash_weekly_goal')}</h3>
            <p className="text-gray-500 text-sm">{weeklyHours}h {t('dash_hours_studied_of')} {weeklyGoal}h</p>
          </div>
          <span className="text-primary-400 font-bold text-xl">{weeklyProgress}%</span>
        </div>
        <div className="w-full bg-app-bg rounded-full h-3">
          <div
            className="bg-gradient-to-r from-primary-700 to-primary-400 h-3 rounded-full transition-all duration-1000"
            style={{ width: `${weeklyProgress}%` }}
          />
        </div>

        {/* Mini bar chart */}
        {analytics && analytics.last7Days.length > 0 && (
          <div className="mt-5">
            <p className="text-gray-500 text-xs mb-3">{t('dash_last7days')}</p>
            <div className="flex items-end gap-2 h-16">
              {(() => {
                const days: Record<string, number> = {};
                for (let i = 6; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  days[d.toISOString().split('T')[0]] = 0;
                }
                analytics.last7Days.forEach(s => {
                  if (days[s.session_date] !== undefined) days[s.session_date] = s.total_minutes;
                });
                const maxMin = Math.max(...Object.values(days), 1);
                return Object.entries(days).map(([date, minutes]) => {
                  const pct = Math.round((minutes / maxMin) * 100);
                  const d = new Date(date + 'T12:00:00');
                  const label = d.toLocaleDateString(activeLocale, { weekday: 'short' }).slice(0, 3);
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-sm bg-primary-600/30 flex items-end" style={{ height: '100%' }}>
                        <div
                          className="w-full rounded-sm bg-gradient-to-t from-primary-800 to-primary-500"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-gray-600 text-[10px]">{label}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-white font-semibold mb-4">{t('dash_quick_access')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { to: '/app/planner', icon: Layers, label: '📋 Planner', color: 'from-primary-700 to-primary-500', desc: `${(analytics?.plannerStats?.in_progress ?? 0)} ${t('dash_in_progress')}`, premium: true },
            { to: '/app/flashcards', icon: BookOpen, label: '📚 Flashcards', color: 'from-violet-700 to-violet-500', desc: `${analytics?.flashcardStats?.total ?? 0} ${t('dash_cards')}`, premium: true },
            { to: '/app/schedule', icon: Calendar, label: `📅 ${t('nav_schedule')}`, color: 'from-indigo-700 to-indigo-500', desc: t('dash_schedule_view_week'), premium: true },
            { to: '/app/analytics', icon: BarChart2, label: `📊 ${t('nav_analytics')}`, color: 'from-fuchsia-700 to-fuchsia-500', desc: t('dash_analytics_view_progress'), premium: true },
          ].map(({ to, icon: Icon, label, color, desc, premium }) => (
            <Link
              key={to}
              to={to}
              className="card-glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200 group relative"
            >
              {premium && !isPremium && (
                <div className="absolute top-3 right-3">
                  <Lock size={12} className="text-gray-600" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-white font-semibold text-sm">{label}</p>
              <p className="text-gray-500 text-xs mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Pomodoro quick start */}
      <div className="card-glass rounded-2xl p-5 card-glow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Timer size={16} className="text-primary-400" />
              {t('dash_pomodoro_quick')}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {t('dash_pomodoro_desc')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/pomodoro" className="btn-secondary">
              {t('dash_open_timer')}
            </Link>
            <Link to="/app/pomodoro?autostart=1" className="btn-primary">
              <Play size={16} /> {t('dash_start_now')}
            </Link>
          </div>
        </div>
      </div>

      {/* Area & Goal */}
      {(user?.area || user?.goal) && (
        <div className="card-glass rounded-2xl p-5 card-glow">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Target size={16} className="text-primary-400" />
            {t('dash_my_goal')}
          </h3>
          {user.area && (
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <span className="text-lg">{getSpecialtyIcon(user.area)}</span>
              <span className="text-gray-500">{t('dash_area_label')} </span>
              <span className="text-white font-medium">{user.area}</span>
            </p>
          )}
          {user?.phase && (
            <div className="mt-3 inline-block">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${phaseConfig[user.phase]?.color}`}>
                📚 {phaseConfig[user.phase]?.label}
              </span>
            </div>
          )}
          {user.goal && (
            <p className="text-gray-400 text-sm mt-1">
              <span className="text-gray-500">{t('dash_goal_label')} </span>
              <span className="text-white font-medium">{user.goal}</span>
            </p>
          )}
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5">
            <Clock size={13} className="text-primary-400" />
            {t('dash_weekly_goal_label')} <span className="text-white font-medium">{user?.weekly_goal_hours}h/semana</span>
          </p>
        </div>
      )}
    </div>
  );
}
