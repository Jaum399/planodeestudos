import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Layers, BookOpen, Calendar, Flame, Target, CheckCircle, Clock, Zap, Lock, Timer, Play, FolderOpen, FileText, GraduationCap, BrainCircuit, Users, TrendingUp, TrendingDown, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { analyticsApi, flashcardsApi } from '../../services/api';
import type { AnalyticsData, FlashcardDeckProgress, FlashcardsProgressSummary } from '../../types';
import { getCourseProfile } from '../../utils/courseProfiles';

const EMPTY_FLASHCARDS_SUMMARY: FlashcardsProgressSummary = {
  tracked_decks: 0,
  reviewed_total: 0,
  correct_total: 0,
  wrong_total: 0,
  due_today_total: 0,
};

function formatLastReviewed(value?: string) {
  if (!value) return 'Sem revisão ainda';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sem revisão ainda';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { language, t } = usePreferences();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentDecks, setRecentDecks] = useState<FlashcardDeckProgress[]>([]);
  const [dueTodayDecks, setDueTodayDecks] = useState<FlashcardDeckProgress[]>([]);
  const [flashcardsSummary, setFlashcardsSummary] = useState<FlashcardsProgressSummary>(EMPTY_FLASHCARDS_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary(),
      flashcardsApi.getProgress(),
    ]).then(([analyticsRes, progressRes]) => {
      setAnalytics(analyticsRes.data);
      setRecentDecks(Array.isArray(progressRes.data?.recentDecks) ? progressRes.data.recentDecks : []);
      setDueTodayDecks(Array.isArray(progressRes.data?.dueTodayDecks) ? progressRes.data.dueTodayDecks : []);
      setFlashcardsSummary(progressRes.data?.summary || EMPTY_FLASHCARDS_SUMMARY);
    }).catch(() => {
      setFlashcardsSummary(EMPTY_FLASHCARDS_SUMMARY);
      setRecentDecks([]);
      setDueTodayDecks([]);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const weeklyHours = analytics ? Math.round(analytics.weeklyMinutes / 60) : 0;
  const weeklyGoal = user?.weekly_goal_hours || 20;
  const weeklyProgress = Math.min(100, Math.round((weeklyHours / weeklyGoal) * 100));
  const isPremium = user && user.plan !== 'free';
  const courseProfile = getCourseProfile(user?.area, user?.goal);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dash_greeting_morning');
    if (h < 18) return t('dash_greeting_afternoon');
    return t('dash_greeting_evening');
  };

  const localeByLanguage: Record<'pt' | 'en' | 'es' | 'ca', string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    ca: 'ca-ES',
  };
  const activeLocale = localeByLanguage[language] || 'pt-BR';

  return (
    <div className="space-y-8 animate-fade-in" aria-busy={isLoading}>
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-400 mt-1">{t('dash_summary_subtitle')}</p>
      </div>

      {isLoading && (
        <div role="status" aria-live="polite" className="card-glass rounded-2xl p-4 text-sm text-gray-400">
          Carregando seu resumo e recomendações...
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="card-glass rounded-2xl p-5 md:p-6 card-glow">
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary-300 mb-3">{courseProfile.title}</p>
          <h2 className="text-white text-xl md:text-2xl font-bold">Seu painel já está ajustado para {courseProfile.title.toLowerCase()}</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl">{courseProfile.subtitle}</p>
          <p className="text-gray-500 text-xs mt-3">{courseProfile.dashboardFocus}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {courseProfile.subjects.slice(0, 4).map((subject) => (
              <span key={subject} className="px-3 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-gray-200">
                {subject}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <Link to="/app/question-bank" className="rounded-2xl border border-primary-500/20 bg-primary-600/10 p-4 hover:border-primary-500/40 transition-colors">
              <p className="text-white font-semibold text-sm">{courseProfile.questionBankTitle}</p>
              <p className="text-gray-500 text-xs mt-1">{courseProfile.questionBankDescription}</p>
            </Link>
            <Link to="/app/lessons" className="rounded-2xl border border-violet-500/20 bg-violet-600/10 p-4 hover:border-violet-500/40 transition-colors">
              <p className="text-white font-semibold text-sm">{courseProfile.lessonsTitle}</p>
              <p className="text-gray-500 text-xs mt-1">{courseProfile.lessonsDescription}</p>
            </Link>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-5 md:p-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Fluxo recomendado</p>
          <div className="space-y-3 text-sm">
            {courseProfile.highlights.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-primary-400" />
                <span className="text-gray-300 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-500/10 rounded-xl">
              <Flame size={18} className="text-orange-400" />
            </div>
            <span className="text-orange-400 text-xs font-semibold">Streak</span>
          </div>
          <p className="text-3xl font-black text-white">{analytics?.streak ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">{t('dash_streak_days')}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-primary-600/10 rounded-xl">
              <Target size={18} className="text-primary-400" />
            </div>
            <span className="text-primary-400 text-xs font-semibold">{t('dash_week')}</span>
          </div>
          <p className="text-3xl font-black text-white">{weeklyProgress}%</p>
          <p className="text-gray-500 text-xs mt-1">{weeklyHours}h / {weeklyGoal}h</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <CheckCircle size={18} className="text-emerald-400" />
            </div>
            <span className="text-emerald-400 text-xs font-semibold">Planner</span>
          </div>
          <p className="text-3xl font-black text-white">{analytics?.plannerStats?.done ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">{t('dash_tasks_completed')}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-violet-500/10 rounded-xl">
              <BookOpen size={18} className="text-violet-400" />
            </div>
            <span className="text-violet-400 text-xs font-semibold">Flashcards</span>
          </div>
          <p className="text-3xl font-black text-white">{analytics?.flashcardStats?.total ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">{t('dash_created')}</p>
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
            { to: '/app/planner', icon: Layers, label: 'Planner', color: 'from-primary-700 to-primary-500', desc: `${(analytics?.plannerStats?.in_progress ?? 0)} ${t('dash_in_progress')}`, premium: true },
            { to: '/app/flashcards', icon: BookOpen, label: 'Flashcards', color: 'from-violet-700 to-violet-500', desc: `${analytics?.flashcardStats?.total ?? 0} ${t('dash_cards')}`, premium: true },
            { to: '/app/schedule', icon: Calendar, label: t('nav_schedule'), color: 'from-indigo-700 to-indigo-500', desc: t('dash_schedule_view_week'), premium: true },
            { to: '/app/analytics', icon: BarChart2, label: t('nav_analytics'), color: 'from-fuchsia-700 to-fuchsia-500', desc: t('dash_analytics_view_progress'), premium: true },
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

      {/* Fluxo Flashcards (estilo Medsimple) */}
      <div>
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-violet-400" />
          Fluxo de Flashcards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-glass rounded-2xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Continuar de onde parou</p>
            {recentDecks.length > 0 ? (
              <div className="space-y-2">
                {recentDecks.slice(0, 3).map((deck) => (
                  <Link
                    key={deck.id}
                    to={`/app/flashcards?deck=${encodeURIComponent(deck.deck_id)}`}
                    className="block rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-white text-sm font-medium truncate">{deck.deck_name}</p>
                    <p className="text-gray-500 text-xs">{formatLastReviewed(deck.last_reviewed_at)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhum deck revisado ainda.</p>
            )}
          </div>

          <div className="card-glass rounded-2xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Revisar hoje</p>
            {dueTodayDecks.length > 0 ? (
              <div className="space-y-2">
                {dueTodayDecks.slice(0, 3).map((deck) => (
                  <Link
                    key={deck.id}
                    to={`/app/flashcards?deck=${encodeURIComponent(deck.deck_id)}`}
                    className="block rounded-xl px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-white text-sm font-medium truncate">{deck.deck_name}</p>
                    <p className="text-amber-300 text-xs">{deck.due_today} card(s) pendentes</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sem revisões pendentes hoje.</p>
            )}
          </div>

          <div className="card-glass rounded-2xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Resumo do dia</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Revisados</span>
                <span className="text-white font-semibold">{flashcardsSummary.reviewed_total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Acertos</span>
                <span className="text-emerald-300 font-semibold">{flashcardsSummary.correct_total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Erros</span>
                <span className="text-red-300 font-semibold">{flashcardsSummary.wrong_total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Pendentes hoje</span>
                <span className="text-amber-300 font-semibold">{flashcardsSummary.due_today_total}</span>
              </div>
            </div>
            <Link to="/app/flashcards" className="text-xs text-primary-400 mt-3 inline-flex items-center gap-1 hover:opacity-80">
              Ir para Flashcards <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Study utilities */}
      <div>
        <h2 className="text-white font-semibold mb-4">Utilidades de Estudo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              to: '/app/question-bank',
              icon: GraduationCap,
              title: 'Banco de Questões',
              desc: 'Treine por disciplina, simulado e ranking de acertos.',
              badge: 'Prática',
              color: 'from-blue-700 to-blue-500',
            },
            {
              to: '/app/pdf-library',
              icon: FolderOpen,
              title: 'Biblioteca de PDFs',
              desc: 'Centralize materiais e organize por pastas temáticas.',
              badge: 'Materiais',
              color: 'from-emerald-700 to-emerald-500',
            },
            {
              to: '/app/summaries',
              icon: BookOpen,
              title: 'Biblioteca de Resumos',
              desc: 'Gere e revise resumos curtos para fixação rápida.',
              badge: 'Revisão',
              color: 'from-violet-700 to-violet-500',
            },
            {
              to: '/app/manuals',
              icon: FileText,
              title: 'Manuais',
              desc: 'Guias de método, execução e consistência de estudo.',
              badge: 'Método',
              color: 'from-amber-700 to-amber-500',
            },
            {
              to: '/app/courses',
              icon: BrainCircuit,
              title: 'Cursos',
              desc: 'Trilhas orientadas por objetivo e etapa de preparação.',
              badge: 'Trilhas',
              color: 'from-fuchsia-700 to-fuchsia-500',
            },
            {
              to: '/app/community',
              icon: Users,
              title: 'Comunidade',
              desc: 'Compartilhe progresso e estratégias com outros alunos.',
              badge: 'Social',
              color: 'from-cyan-700 to-cyan-500',
            },
          ].map(({ to, icon: Icon, title, desc, badge, color }) => (
            <Link key={to} to={to} className="card-glass rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary-500/30 text-primary-300 bg-primary-600/10">{badge}</span>
              </div>
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-gray-500 text-xs mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Seu avanço do dia */}
      <div>
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Target size={16} className="text-primary-400" />
          Seu avanço do dia
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Meta do dia (Questões)',
              value: analytics?.todayStats?.questions ?? 0,
              goal: user?.weekly_goal_hours ? Math.round(user.weekly_goal_hours * 100 / 7) : 100,
              suffix: '',
              icon: GraduationCap,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              link: '/app/question-bank',
              cta: 'Fazer questões →',
            },
            {
              label: 'Taxa de acerto',
              value: analytics?.todayStats?.accuracy ?? 0,
              goal: 80,
              suffix: '%',
              icon: TrendingUp,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              hint: 'Desejável: ≥ 80%',
            },
            {
              label: 'Flashcards revisados',
              value: analytics?.todayStats?.flashcardsReviewed ?? 0,
              goal: null,
              suffix: '',
              icon: BookOpen,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
              link: '/app/flashcards',
              cta: 'Revisar flashcards →',
            },
            {
              label: 'Sessões de estudo',
              value: analytics?.todayStats?.lessons ?? 0,
              goal: null,
              suffix: '',
              icon: Clock,
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
              link: '/app/analytics',
              cta: 'Ver histórico →',
            },
          ].map(({ label, value, goal, suffix, icon: Icon, color, bg, link, cta, hint }) => (
            <div key={label} className="card-glass rounded-2xl p-5 flex flex-col gap-2">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
              <p className={`text-3xl font-black text-white`}>{value}{suffix}</p>
              <p className="text-gray-500 text-xs leading-snug">{label}</p>
              {goal !== null && (
                <div className="w-full bg-app-bg rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-700 ${value >= goal ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-700 to-primary-400'}`}
                    style={{ width: `${Math.min(100, Math.round((Number(value) / goal) * 100))}%` }}
                  />
                </div>
              )}
              {hint && <p className="text-gray-600 text-[10px]">{hint}</p>}
              {link && cta && (
                <Link to={link} className={`text-[11px] font-medium mt-auto ${color} hover:opacity-80`}>{cta}</Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* O que estudar agora */}
      {analytics && analytics.subjectAccuracy.length > 0 && (
        <div className="card-glass rounded-2xl p-6 card-glow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-400" />
                O que estudar agora
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">Baseado no seu desempenho por disciplina</p>
            </div>
            <Link to="/app/analytics" className="text-xs text-primary-400 flex items-center gap-1 hover:opacity-80">
              Ver tudo <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {[...analytics.subjectAccuracy]
              .sort((a, b) => a.accuracy - b.accuracy)
              .slice(0, 4)
              .map(({ subject, accuracy, total }) => {
                const isWeak = accuracy < 60;
                return (
                  <div key={subject} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isWeak ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                      {isWeak
                        ? <TrendingDown size={14} className="text-red-400" />
                        : <TrendingUp size={14} className="text-emerald-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium truncate">{subject}</span>
                        <span className={`text-xs font-bold ml-2 shrink-0 ${isWeak ? 'text-red-400' : 'text-emerald-400'}`}>{accuracy}%</span>
                      </div>
                      <div className="w-full bg-app-bg rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${isWeak ? 'bg-gradient-to-r from-red-800 to-red-500' : 'bg-gradient-to-r from-emerald-700 to-emerald-400'}`}
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                      <p className="text-gray-600 text-[10px] mt-0.5">{total} questões respondidas</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Progresso por disciplina (todas) */}
      {analytics && analytics.subjectAccuracy.length > 0 && (
        <div className="card-glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BarChart2 size={15} className="text-primary-400" />
              Sua evolução por disciplina
            </h3>
            <span className="text-gray-500 text-xs">Últimos 30 dias</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analytics.subjectAccuracy.map(({ subject, accuracy }) => (
              <div key={subject} className="flex items-center gap-3">
                <span className="text-gray-400 text-xs w-28 shrink-0 truncate">{subject}</span>
                <div className="flex-1 bg-app-bg rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${accuracy >= 80 ? 'bg-emerald-500' : accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
                <span className="text-gray-400 text-xs w-10 text-right shrink-0">{accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meus Boosts — heatmap de atividade */}
      <div className="card-glass rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Flame size={15} className="text-orange-400" />
          Meus Boosts
        </h3>
        {(() => {
          const today = new Date();
          const cells: { date: string; minutes: number }[] = [];
          for (let i = 83; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const entry = analytics?.activityHeatmap?.find(h => h.date === dateStr);
            cells.push({ date: dateStr, minutes: entry?.minutes ?? 0 });
          }
          const maxMin = Math.max(...cells.map(c => c.minutes), 1);
          const weeks: typeof cells[] = [];
          for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
          return (
            <div className="overflow-x-auto">
              <div className="flex gap-1.5 min-w-0">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1.5">
                    {week.map(({ date, minutes }) => {
                      const intensity = minutes === 0 ? 0 : Math.ceil((minutes / maxMin) * 4);
                      const bg = intensity === 0 ? 'bg-white/5' : intensity === 1 ? 'bg-primary-900/60' : intensity === 2 ? 'bg-primary-700/70' : intensity === 3 ? 'bg-primary-600' : 'bg-primary-400';
                      return (
                        <div
                          key={date}
                          title={`${date}: ${minutes} min`}
                          className={`w-3.5 h-3.5 rounded-sm ${bg} cursor-default`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-gray-600 text-[10px]">Menos</span>
                {['bg-white/5', 'bg-primary-900/60', 'bg-primary-700/70', 'bg-primary-600', 'bg-primary-400'].map((bg, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${bg}`} />
                ))}
                <span className="text-gray-600 text-[10px]">Mais</span>
              </div>
            </div>
          );
        })()}
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
            <p className="text-gray-400 text-sm">
              <span className="text-gray-500">{t('dash_area_label')} </span>
              <span className="text-white font-medium">{user.area}</span>
            </p>
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
