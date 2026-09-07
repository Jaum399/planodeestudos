import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Layers, Calendar, BarChart2,
  Settings, LogOut, Menu, BrainCircuit, Zap, Crown, Map, Bot, Sun, Moon, Languages, Bell, Clock, X, Volume2, VolumeX, GraduationCap,
  Lightbulb, ScrollText, PlayCircle, Sparkles, StickyNote, Users, FileText, Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { jarvisApi, reminderSessionApi } from '../services/api';
import TrialBanner from './TrialBanner';
import { preloadRoute } from '../utils/routePrefetch';

const LANG_TO_SPEECH: Record<'pt' | 'en' | 'es' | 'ca', string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  ca: 'ca-ES',
};

type VoiceModel = 'tigas_core' | 'manus_ia' | 'manus_ia_pro' | 'aios' | 'aios_coach';
type VoicePreset = 'adaptive' | 'calm' | 'objective' | 'energetic';

type SpeechTuning = {
  rate: number;
  pitch: number;
  volume: number;
};

type VoiceAdaptation = {
  interruption_count: number;
  repeated_command_count: number;
  toggled_off_count: number;
  adaptive_offsets: {
    rate: number;
    pitch: number;
  };
};

const DEFAULT_VOICE_ADAPTATION: VoiceAdaptation = {
  interruption_count: 0,
  repeated_command_count: 0,
  toggled_off_count: 0,
  adaptive_offsets: {
    rate: 0,
    pitch: 0,
  },
};

const navItems = [
  { path: '/app/dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard },
  { path: '/app/how-to-study', labelKey: 'nav_how_to_study', icon: Lightbulb },
  { path: '/app/planner', labelKey: 'nav_planner', icon: Layers, premium: true },
  { path: '/app/flashcards', labelKey: 'nav_flashcards', icon: BookOpen, premium: true },
  { path: '/app/question-bank', labelKey: 'nav_question_bank', icon: GraduationCap, premium: true },
  { path: '/app/lessons', labelKey: 'nav_lessons', icon: PlayCircle },
  { path: '/app/stories', labelKey: 'nav_stories', icon: Sparkles },
  { path: '/app/summaries', labelKey: 'nav_summaries', icon: ScrollText, premium: true },
  { path: '/app/courses', labelKey: 'nav_courses', icon: BrainCircuit },
  { path: '/app/manuals', labelKey: 'nav_manuals', icon: FileText },
  { path: '/app/notes', labelKey: 'nav_notes', icon: StickyNote },
  { path: '/app/community', labelKey: 'nav_community', icon: Users },
  { path: '/app/schedule', labelKey: 'nav_schedule', icon: Calendar, premium: true },
  { path: '/app/analytics', labelKey: 'nav_analytics', icon: BarChart2, premium: true },
  { path: '/app/jarvis', labelKey: 'nav_tigas', icon: Bot, premium: true },
  { path: '/app/reminders', labelKey: 'nav_reminders', icon: Bell },
  { path: '/app/pomodoro', labelKey: 'nav_pomodoro', icon: Clock },
  { path: '/app/mindmap', labelKey: 'nav_mindmap', icon: Map, premium: true },
  { path: '/app/settings', labelKey: 'nav_settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adaptiveVoiceModel, setAdaptiveVoiceModel] = useState<VoiceModel>('tigas_core');
  const [voicePreset, setVoicePreset] = useState<VoicePreset>('adaptive');
  const [voiceAdaptation, setVoiceAdaptation] = useState<VoiceAdaptation>(DEFAULT_VOICE_ADAPTATION);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('app.voiceEnabled');
    return saved === null ? true : saved === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, language, setLanguage, t } = usePreferences();

  const openSearch = useCallback(() => { setSearchQuery(''); setSearchOpen(true); }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const warmRoute = useCallback((path: string) => preloadRoute(path), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchQuery('');
        setSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function sameLocalDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function normalizeSpeechText(text: string): string {
    return text
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/[#*_`~>|\[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getModelSpeechTuning(model: VoiceModel, reminderCount: number): SpeechTuning {
    const urgent = reminderCount >= 3;

    if (model === 'manus_ia_pro') {
      return { rate: urgent ? 1.02 : 0.98, pitch: 1.05, volume: 1 };
    }
    if (model === 'manus_ia') {
      return { rate: urgent ? 1.04 : 1, pitch: 1.08, volume: 1 };
    }
    if (model === 'aios_coach') {
      return { rate: 0.93, pitch: 0.95, volume: 1 };
    }
    if (model === 'aios') {
      return { rate: 0.95, pitch: 0.97, volume: 1 };
    }
    return { rate: urgent ? 1 : 0.97, pitch: 1.01, volume: 1 };
  }

  function getAdaptationOffsets(adaptation: VoiceAdaptation): { rate: number; pitch: number } {
    const rawRate = Number(adaptation?.adaptive_offsets?.rate || 0);
    const rawPitch = Number(adaptation?.adaptive_offsets?.pitch || 0);
    return {
      rate: Math.max(-0.12, Math.min(0.06, rawRate)),
      pitch: Math.max(-0.12, Math.min(0.06, rawPitch)),
    };
  }

  function getVoicePresetOffsets(preset: VoicePreset): { rate: number; pitch: number } {
    if (preset === 'calm') return { rate: -0.06, pitch: -0.03 };
    if (preset === 'objective') return { rate: 0.02, pitch: -0.01 };
    if (preset === 'energetic') return { rate: 0.05, pitch: 0.05 };
    return { rate: 0, pitch: 0 };
  }

  async function reportVoiceFeedback(feedbackType: 'interrupted' | 'repeated_command' | 'toggled_off') {
    if (!user) return;
    try {
      const { data } = await jarvisApi.voiceFeedback(feedbackType);
      if (data?.voiceAdaptation) {
        setVoiceAdaptation(data.voiceAdaptation);
      }
    } catch {
      // Feedback implícito não pode quebrar a UX.
    }
  }

  async function resolvePreferredVoice(langCode: string): Promise<SpeechSynthesisVoice | null> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    if (!voices.length) {
      voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
        const timeout = setTimeout(() => resolve(synth.getVoices()), 900);
        synth.onvoiceschanged = () => {
          clearTimeout(timeout);
          resolve(synth.getVoices());
        };
      });
    }

    const langPrefix = langCode.split('-')[0].toLowerCase();
    const preferred = voices
      .filter((voice) => voice.lang.toLowerCase().startsWith(langPrefix))
      .map((voice) => {
        let score = 0;
        const name = voice.name.toLowerCase();
        const lang = voice.lang.toLowerCase();

        if (lang === langCode.toLowerCase()) score += 24;
        if (!voice.localService) score += 12;
        if (/neural|natural|wavenet|studio|premium|enhanced|online|cloud/i.test(name)) score += 28;
        if (/google|microsoft|apple|samantha|luciana|helena/i.test(name)) score += 16;
        if (/compact|legacy|espeak|pico|festival|old/i.test(name)) score -= 16;

        return { voice, score };
      })
      .sort((a, b) => b.score - a.score)[0];

    return preferred?.voice || voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) || null;
  }

  async function speakLoginGreetingAndImportantReminders() {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof window.SpeechSynthesisUtterance === 'undefined' ||
      !user
    ) return;

    const voiceEnabled = localStorage.getItem('app.voiceEnabled');
    if (voiceEnabled === 'false') return;

    const loginEvent = sessionStorage.getItem('ordex_login_event');
    if (!loginEvent) return;
    const handled = sessionStorage.getItem('ordex_login_event_handled');
    if (handled === loginEvent) return;

    const greeting = `Olá, ${user.name}.`;
    let reminderPhrase = 'Você não possui lembretes importantes para hoje.';
    let selectedVoiceModel: VoiceModel = adaptiveVoiceModel;
    let selectedVoicePreset: VoicePreset = voicePreset;
    let selectedVoiceAdaptation: VoiceAdaptation = voiceAdaptation;
    let remindersCount = 0;

    try {
      const [remindersResult, jarvisStateResult] = await Promise.all([
        reminderSessionApi.getAll({ includeFinalized: false }),
        jarvisApi.getState().catch(() => null),
      ]);

      const items = Array.isArray(remindersResult?.data?.items) ? remindersResult.data.items : [];
      const today = new Date();

      const possibleVoiceModel = jarvisStateResult?.data?.voiceModel as VoiceModel | undefined;
      if (possibleVoiceModel) {
        selectedVoiceModel = possibleVoiceModel;
        setAdaptiveVoiceModel(possibleVoiceModel);
      }
      const possibleVoicePreset = jarvisStateResult?.data?.voicePreset as VoicePreset | undefined;
      if (possibleVoicePreset) {
        selectedVoicePreset = possibleVoicePreset;
        setVoicePreset(possibleVoicePreset);
      }
      if (jarvisStateResult?.data?.voiceAdaptation) {
        selectedVoiceAdaptation = jarvisStateResult.data.voiceAdaptation;
        setVoiceAdaptation(jarvisStateResult.data.voiceAdaptation);
      }

      const importantToday = items.filter((item: { active?: boolean; due_at?: string; title?: string; kind?: string }) => {
        if (item.active === false || !item.due_at) return false;
        const due = new Date(item.due_at);
        if (Number.isNaN(due.getTime())) return false;
        return sameLocalDay(today, due);
      });
      remindersCount = importantToday.length;

      if (importantToday.length > 0) {
        const formatted = importantToday
          .slice(0, 5)
          .map((item: { title?: string; kind?: string; due_at?: string }) => {
            const due = item.due_at ? new Date(item.due_at) : null;
            const hh = due ? String(due.getHours()).padStart(2, '0') : '--';
            const mm = due ? String(due.getMinutes()).padStart(2, '0') : '--';
            const kindText = item.kind === 'prova' ? 'prova' : item.kind === 'trabalho' ? 'trabalho' : 'lembrete';
            return `${kindText} ${item.title || 'sem título'} às ${hh} e ${mm}`;
          });

        reminderPhrase = `Seus lembretes importantes de hoje são: ${formatted.join('. ')}.`;
      }
    } catch {
      reminderPhrase = 'Não consegui carregar seus lembretes importantes de hoje.';
    }

    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof synth.speak !== 'function' || typeof synth.cancel !== 'function') return;
      const langCode = LANG_TO_SPEECH[language] || 'pt-BR';
      const preferredVoice = await resolvePreferredVoice(langCode);
      const tuning = getModelSpeechTuning(selectedVoiceModel, remindersCount);
      const adaptationOffsets = getAdaptationOffsets(selectedVoiceAdaptation);
      const presetOffsets = getVoicePresetOffsets(selectedVoicePreset);
      const tunedRate = Math.max(0.84, Math.min(1.16, tuning.rate + adaptationOffsets.rate + presetOffsets.rate));
      const tunedPitch = Math.max(0.84, Math.min(1.2, tuning.pitch + adaptationOffsets.pitch + presetOffsets.pitch));
      const cleanGreeting = normalizeSpeechText(greeting);
      const cleanReminderPhrase = normalizeSpeechText(reminderPhrase);

      synth.cancel();
      synth.resume();

      const utteranceGreeting = new SpeechSynthesisUtterance(cleanGreeting);
      utteranceGreeting.lang = langCode;
      utteranceGreeting.rate = tunedRate;
      utteranceGreeting.pitch = tunedPitch;
      utteranceGreeting.volume = tuning.volume;
      if (preferredVoice) utteranceGreeting.voice = preferredVoice;

      const utteranceReminders = new SpeechSynthesisUtterance(cleanReminderPhrase);
      utteranceReminders.lang = langCode;
      utteranceReminders.rate = tunedRate;
      utteranceReminders.pitch = tunedPitch;
      utteranceReminders.volume = tuning.volume;
      if (preferredVoice) utteranceReminders.voice = preferredVoice;

      synth.speak(utteranceGreeting);
      synth.speak(utteranceReminders);

      sessionStorage.setItem('ordex_login_event_handled', loginEvent);
    } catch {
      // Ignora falhas de voz para não impactar a navegação do usuário.
    }
  }

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAdaptiveVoiceModel() {
      if (!user) {
        if (!cancelled) setAdaptiveVoiceModel('tigas_core');
        return;
      }
      try {
        const { data } = await jarvisApi.getState();
        const model = (data?.voiceModel as VoiceModel | undefined) || 'tigas_core';
        if (!cancelled) {
          setAdaptiveVoiceModel(model);
          setVoicePreset((data?.voicePreset as VoicePreset | undefined) || 'adaptive');
          if (data?.voiceAdaptation) {
            setVoiceAdaptation(data.voiceAdaptation);
          }
        }
      } catch {
        if (!cancelled) setAdaptiveVoiceModel('tigas_core');
      }
    }

    loadAdaptiveVoiceModel();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    speakLoginGreetingAndImportantReminders();
  }, [user]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'app.voiceEnabled') {
        setVoiceEnabled(event.newValue === null ? true : event.newValue === 'true');
      }
    };
    const onVoicePreferenceChanged = (event: Event) => {
      const custom = event as CustomEvent<{ enabled?: boolean }>;
      if (typeof custom.detail?.enabled === 'boolean') {
        setVoiceEnabled(custom.detail.enabled);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('app:voicePreferenceChanged', onVoicePreferenceChanged as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('app:voicePreferenceChanged', onVoicePreferenceChanged as EventListener);
    };
  }, []);

  const toggleVoice = () => {
    const next = !voiceEnabled;

    if (!next) {
      const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
      const speakingNow = Boolean(synth?.speaking || synth?.pending);
      if (speakingNow) {
        reportVoiceFeedback('interrupted');
      }
      reportVoiceFeedback('toggled_off');
      synth?.cancel();
    }

    setVoiceEnabled(next);
    localStorage.setItem('app.voiceEnabled', String(next));
    window.dispatchEvent(new CustomEvent('app:voicePreferenceChanged', { detail: { enabled: next } }));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isMacPlatform = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  const searchShortcutLabel = isMacPlatform ? '⌘K' : 'Ctrl+K';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  const isPremium = user && user.plan !== 'free';

  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* ⌘K Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={closeSearch}>
          <div className="w-full max-w-lg bg-app-surface border border-app-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-app-border">
              <Search size={16} className="text-gray-500 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="O que você quer estudar?"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
              />
              <kbd className="text-[10px] text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto py-2">
              {navItems
                .filter(({ labelKey }) => {
                  const label = t(labelKey).toLowerCase();
                  return !searchQuery || label.includes(searchQuery.toLowerCase());
                })
                .map(({ path, labelKey, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => { navigate(path); closeSearch(); }}
                    onMouseEnter={() => warmRoute(path)}
                    onFocus={() => warmRoute(path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <Icon size={16} className="text-primary-400 shrink-0" />
                    <span className="text-white text-sm">{t(labelKey)}</span>
                    <span className="ml-auto text-gray-600 text-xs truncate">{path.replace('/app/', '')}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-app-surface border-r border-app-border z-30 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-app-border flex-shrink-0">
          <Link to="/app/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <BrainCircuit size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">Ordex</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 hover:text-white transition-colors"
            title={t('app_close_menu')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav - Main scrollable area */}
        <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
          {navItems.map(({ path, labelKey, icon: Icon, premium }) => {
            return (
              <Link
                key={path}
                to={path}
                onMouseEnter={() => warmRoute(path)}
                onFocus={() => warmRoute(path)}
                onTouchStart={() => warmRoute(path)}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`sidebar-item ${location.pathname === path ? 'active' : ''}`}
              >
                <Icon size={18} />
                {t(labelKey)}
                {premium && !isPremium && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-600/30 text-primary-400 border border-primary-500/30">
                    PRO
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade banner for free users */}
        {!isPremium && (
          <div className="px-3 pb-2 flex-shrink-0 border-t border-app-border/50 pt-2">
            <Link
              to="/app/upgrade"
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600/20 to-primary-800/20 border border-primary-500/30 hover:border-primary-500/60 transition-all group"
            >
              <Zap size={16} className="text-primary-400 group-hover:text-primary-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold">{t('app_subscribe_premium')}</p>
                <p className="text-gray-500 text-[10px]">{t('app_from_price')}</p>
              </div>
            </Link>
          </div>
        )}

        {/* User info */}
        <div className="p-3 border-t border-app-border flex-shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user ? getInitials(user.name) : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5">
                {isPremium ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
                    <Crown size={9} /> {t('plan_premium')}
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs">{t('plan_free')}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors p-1"
              title={t('logout')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
        {/* Top bar */}
        <header className="h-16 bg-app-bg/80 backdrop-blur border-b border-app-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="text-gray-400 hover:text-white"
            title={sidebarOpen ? t('app_close_sidebar') : t('app_open_sidebar')}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="md:hidden flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              <BrainCircuit size={12} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">Ordex</span>
          </div>

          {/* ⌘K search button */}
          <button
            onClick={openSearch}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-app-border bg-app-card text-gray-400 hover:text-white hover:border-primary-500/40 transition-colors text-sm"
          >
            <Search size={14} />
            <span className="text-xs text-gray-500">O que você quer estudar?</span>
            <kbd className="text-[10px] text-gray-600 border border-gray-700 rounded px-1.5 py-0.5 ml-2">{searchShortcutLabel}</kbd>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={toggleTheme}
              title={t('theme_toggle')}
              className="w-9 h-9 rounded-lg border border-app-border bg-app-card text-gray-300 hover:text-white hover:border-primary-500/40 transition-colors flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={toggleVoice}
              title={`${t('settings_auto_voice_login')} (${adaptiveVoiceModel})`}
              className={`h-9 px-3 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-semibold ${voiceEnabled ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:text-emerald-200' : 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:text-amber-200'}`}
            >
              {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{t('settings_auto_voice_login')}: {voiceEnabled ? t('settings_enabled') : t('settings_disabled')}</span>
            </button>

            <div className="relative">
              <Languages size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'pt' | 'en' | 'es' | 'ca')}
                title={t('language_label')}
                className="h-9 pl-8 pr-3 rounded-lg border border-app-border bg-app-card text-gray-300 text-xs focus:outline-none focus:border-primary-500/40"
              >
                <option value="pt">PT</option>
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="ca">CA</option>
              </select>
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-primary-500/50 transition-all"
                title={user?.name}
              >
                {user ? getInitials(user.name) : '?'}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-app-surface border border-app-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-app-border">
                    <p className="text-white text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-gray-500 text-xs truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/app/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <Settings size={15} />
                    {t('nav_settings')}
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={15} />
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Payment overdue banner */}
        <TrialBanner />

        {/* Page content */}
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
