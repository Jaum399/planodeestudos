import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { authApi, jarvisApi } from '../../services/api';
import { Check, User, Lock, Target, Palette, Languages, Volume2, RotateCcw, TrendingDown, TrendingUp, BrainCircuit, Sparkles } from 'lucide-react';
import { clampWeeklyGoal, formatWhatsappBr, inferAreaFromGoal } from '../../utils/formAutomation';

const AREAS = [
  '', 'Faculdade', 'Residência Médica', 'OAB', 'ENEM & Vestibulares',
  'Concursos Públicos', 'Revalida', 'Pós-Graduação', 'Militares',
  'Línguas', 'Magistratura', 'Engenharia', 'Direito', 'Medicina',
];

type VoiceDailyFeedback = {
  date: string;
  interrupted?: number;
  repeated_command?: number;
  toggled_off?: number;
};

type VoiceAdaptation = {
  interruption_count: number;
  repeated_command_count: number;
  toggled_off_count: number;
  daily_feedback: VoiceDailyFeedback[];
  adaptive_offsets: {
    rate: number;
    pitch: number;
  };
  last_feedback_at: string | null;
};

type VoicePreset = 'adaptive' | 'calm' | 'objective' | 'energetic';

const EMPTY_VOICE_ADAPTATION: VoiceAdaptation = {
  interruption_count: 0,
  repeated_command_count: 0,
  toggled_off_count: 0,
  daily_feedback: [],
  adaptive_offsets: { rate: 0, pitch: 0 },
  last_feedback_at: null,
};

const VOICE_PRESET_OPTIONS: Array<{ value: VoicePreset; labelKey: string; descriptionKey: string }> = [
  { value: 'adaptive', labelKey: 'settings_preset_auto', descriptionKey: 'settings_preset_auto_desc' },
  { value: 'calm', labelKey: 'settings_preset_calm', descriptionKey: 'settings_preset_calm_desc' },
  { value: 'objective', labelKey: 'settings_preset_objective', descriptionKey: 'settings_preset_objective_desc' },
  { value: 'energetic', labelKey: 'settings_preset_energetic', descriptionKey: 'settings_preset_energetic_desc' },
];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme, language, setLanguage, accessibility, setHighContrast, setReducedMotion, setReadingProfile, setFontScale, t } = usePreferences();
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('app.voiceEnabled');
    return saved === null ? true : saved === 'true';
  });
  const [voiceAdaptation, setVoiceAdaptation] = useState<VoiceAdaptation>(EMPTY_VOICE_ADAPTATION);
  const [voicePreset, setVoicePreset] = useState<VoicePreset>('adaptive');
  const [voiceProfileLoading, setVoiceProfileLoading] = useState(true);
  const [voiceProfileError, setVoiceProfileError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    area: user?.area || '',
    goal: user?.goal || '',
    weekly_goal_hours: user?.weekly_goal_hours || 20,
    whatsapp: user?.whatsapp || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadVoiceProfile() {
      setVoiceProfileLoading(true);
      setVoiceProfileError('');
      try {
        const { data } = await jarvisApi.getState();
        if (!cancelled) {
          setVoiceAdaptation(data?.voiceAdaptation || EMPTY_VOICE_ADAPTATION);
          setVoicePreset((data?.voicePreset as VoicePreset | undefined) || 'adaptive');
        }
      } catch {
        if (!cancelled) {
          setVoiceProfileError(t('settings_voice_load_error'));
        }
      } finally {
        if (!cancelled) {
          setVoiceProfileLoading(false);
        }
      }
    }

    loadVoiceProfile();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const weeklyFeedback = voiceAdaptation.daily_feedback.slice(-7);
  const weeklyTotals = weeklyFeedback.reduce(
    (acc, item) => {
      acc.interrupted += Number(item.interrupted || 0);
      acc.repeated += Number(item.repeated_command || 0);
      acc.toggledOff += Number(item.toggled_off || 0);
      return acc;
    },
    { interrupted: 0, repeated: 0, toggledOff: 0 }
  );
  const totalWeeklySignals = weeklyTotals.interrupted + weeklyTotals.repeated + weeklyTotals.toggledOff;
  const trendLabel = totalWeeklySignals === 0
    ? t('settings_trend_stable')
    : totalWeeklySignals <= 3
      ? t('settings_trend_light')
      : totalWeeklySignals <= 7
        ? t('settings_trend_moderate')
        : t('settings_trend_intense');
  const trendToneClass = totalWeeklySignals === 0
    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : totalWeeklySignals <= 3
      ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'
      : 'text-amber-300 border-amber-500/30 bg-amber-500/10';

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const found = voiceAdaptation.daily_feedback.find((item) => item.date === key);
    const total = Number(found?.interrupted || 0) + Number(found?.repeated_command || 0) + Number(found?.toggled_off || 0);
    return {
      key,
      label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      total,
      interrupted: Number(found?.interrupted || 0),
      repeated: Number(found?.repeated_command || 0),
      toggledOff: Number(found?.toggled_off || 0),
    };
  });
  const maxGraphValue = Math.max(1, ...last7Days.map((item) => item.total));
  const recommendations: string[] = [];
  if (voicePreset === 'adaptive') {
    recommendations.push(t('settings_recommend_auto'));
  } else if (voicePreset === 'calm') {
    recommendations.push(t('settings_recommend_calm'));
  } else if (voicePreset === 'objective') {
    recommendations.push(t('settings_recommend_objective'));
  } else {
    recommendations.push(t('settings_recommend_energetic'));
  }
  if (weeklyTotals.interrupted >= 3) {
    recommendations.push(t('settings_recommend_interruptions'));
  }
  if (weeklyTotals.repeated >= 2) {
    recommendations.push(t('settings_recommend_repeats'));
  }
  if (weeklyTotals.toggledOff >= 2) {
    recommendations.push(t('settings_recommend_toggles'));
  }
  if (recommendations.length === 1 && totalWeeklySignals === 0) {
    recommendations.push(t('settings_recommend_stable'));
  }

  const handleVoicePresetChange = async (preset: VoicePreset) => {
    setVoicePreset(preset);
    setPresetLoading(true);
    setVoiceProfileError('');
    try {
      await jarvisApi.updateVoiceProfile(preset);
    } catch {
      setVoiceProfileError(t('settings_voice_preset_error'));
    } finally {
      setPresetLoading(false);
    }
  };

  const handleResetVoiceAdaptation = async () => {
    setResetLoading(true);
    setVoiceProfileError('');
    try {
      const { data } = await jarvisApi.resetVoiceAdaptation();
      setVoiceAdaptation(data?.voiceAdaptation || EMPTY_VOICE_ADAPTATION);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch {
      setVoiceProfileError(t('settings_voice_reset_error'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('app.voiceEnabled', String(next));
    window.dispatchEvent(new CustomEvent('app:voicePreferenceChanged', { detail: { enabled: next } }));
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileLoading(true);
    try {
      const { data } = await authApi.updateMe({
        name: profileForm.name,
        area: profileForm.area,
        goal: profileForm.goal,
        weekly_goal_hours: profileForm.weekly_goal_hours,
        whatsapp: profileForm.whatsapp,
      });
      updateUser(data.user);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setProfileError(msg || 'Erro ao atualizar perfil.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('As senhas não coincidem.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setPasswordError(msg || 'Erro ao alterar senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settings_title')}</h1>
        <p className="text-gray-400 text-sm mt-1">{t('settings_subtitle')}</p>
      </div>

      {/* Profile section */}
      <div className="card-glass rounded-2xl p-6 card-glow">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <User size={16} className="text-primary-400" /> {t('settings_profile_info')}
        </h2>

        {profileSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2 mb-4">
            <Check size={15} /> {t('settings_profile_updated')}
          </div>
        )}
        {profileError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{profileError}</div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_profile_name')}</label>
            <input
              className="input-field"
              value={profileForm.name}
              onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_profile_email_ro')}</label>
            <input
              className="input-field opacity-50 cursor-not-allowed"
              value={user?.email || ''}
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_profile_area')}</label>
            <select
              className="input-field"
              value={profileForm.area}
              onChange={e => setProfileForm(p => ({ ...p, area: e.target.value }))}
            >
              {AREAS.map(a => (
                <option key={a} value={a} className="bg-app-card">
                  {a || 'Selecione sua área...'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_profile_goal')}</label>
            <input
              className="input-field"
              placeholder={t('settings_profile_goal_ph')}
              value={profileForm.goal}
              onChange={e => {
                const nextGoal = e.target.value;
                const inferredArea = !profileForm.area ? inferAreaFromGoal(nextGoal) : null;
                setProfileForm(p => ({ ...p, goal: nextGoal, area: inferredArea || p.area }));
              }}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_profile_whatsapp')}</label>
            <input
              type="tel"
              className="input-field"
              placeholder={t('settings_profile_whatsapp_ph')}
              value={profileForm.whatsapp}
              onChange={e => setProfileForm(p => ({ ...p, whatsapp: formatWhatsappBr(e.target.value) }))}
              autoComplete="tel"
            />
            <p className="text-[11px] text-gray-600 mt-1">{t('settings_profile_whatsapp_help')}</p>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">
              {t('settings_profile_weekly_goal')}: <span className="text-primary-400">{profileForm.weekly_goal_hours}h/semana</span>
            </label>
            <input
              type="range"
              min="5"
              max="60"
              value={profileForm.weekly_goal_hours}
              onChange={e => setProfileForm(p => ({ ...p, weekly_goal_hours: clampWeeklyGoal(Number(e.target.value)) }))}
              className="w-full accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>5h</span>
              <span>60h</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="btn-primary text-sm py-3 px-6 disabled:opacity-60"
          >
            {profileLoading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('settings_saving')}</>
              : <><Check size={15} /> {t('settings_save_changes')}</>
            }
          </button>
        </form>
      </div>

      {/* Password section */}
      <div className="card-glass rounded-2xl p-6 card-glow">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
          <Lock size={16} className="text-primary-400" /> {t('settings_password_change')}
        </h2>

        {passwordSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2 mb-4">
            <Check size={15} /> {t('settings_password_updated')}
          </div>
        )}
        {passwordError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{passwordError}</div>
        )}

        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_password_current')}</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={passwordForm.current_password}
              onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_password_new')}</label>
            <input
              type="password"
              className="input-field"
              placeholder={t('settings_password_new_ph')}
              value={passwordForm.new_password}
              onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">{t('settings_password_confirm')}</label>
            <input
              type="password"
              className="input-field"
              placeholder={t('settings_password_confirm_ph')}
              value={passwordForm.confirm_password}
              onChange={e => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="btn-primary text-sm py-3 px-6 disabled:opacity-60"
          >
            {passwordLoading
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('settings_changing')}</>
              : <><Lock size={15} /> {t('settings_change_password')}</>
            }
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card-glass rounded-2xl p-6 card-glow">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Target size={16} className="text-primary-400" /> {t('settings_account_info')}
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('settings_plan_current')}</span>
            <span className="text-primary-300 font-semibold capitalize">{user?.plan || 'Free'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('settings_member_since')}</span>
            <span className="text-gray-300">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('settings_area')}</span>
            <span className="text-gray-300">{user?.area || t('settings_not_defined')}</span>
          </div>
        </div>
      </div>

      {/* App preferences */}
      <div className="card-glass rounded-2xl p-6 card-glow">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Palette size={16} className="text-primary-400" /> {t('settings_app_prefs')}
        </h2>

        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-2">{t('settings_theme')}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-lg border transition-colors ${theme === 'dark' ? 'border-primary-500/50 bg-primary-600/20 text-white' : 'border-app-border text-gray-400 hover:text-white'}`}
              >
                {t('settings_theme_dark')}
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-lg border transition-colors ${theme === 'light' ? 'border-primary-500/50 bg-primary-600/20 text-white' : 'border-app-border text-gray-400 hover:text-white'}`}
              >
                {t('settings_theme_light')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-2 flex items-center gap-2">
              <Languages size={14} /> {t('settings_language')}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'pt' | 'en' | 'es' | 'ca')}
              className="input-field"
            >
              <option value="pt">Portugues</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="ca">Catala</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-2 flex items-center gap-2">
              <Volume2 size={14} /> {t('settings_auto_voice_login')}
            </label>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-app-card/50 px-3 py-2">
              <p className="text-xs text-gray-400">{t('settings_auto_voice_desc')}</p>
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${voiceEnabled ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-app-border text-gray-400 hover:text-white'}`}
              >
                {voiceEnabled ? t('settings_enabled') : t('settings_disabled')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-card/40 p-4 space-y-4">
            <div>
              <p className="text-white text-sm font-semibold">{t('settings_accessibility')}</p>
              <p className="text-gray-500 text-xs mt-1">{t('settings_accessibility_desc')}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-black/10 px-3 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{t('settings_high_contrast')}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('settings_high_contrast_desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHighContrast(!accessibility.highContrast)}
                  aria-pressed={accessibility.highContrast}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${accessibility.highContrast ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-app-border text-gray-400 hover:text-white'}`}
                >
                  {accessibility.highContrast ? t('settings_enabled') : t('settings_disabled')}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-black/10 px-3 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{t('settings_reduce_motion')}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('settings_reduce_motion_desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReducedMotion(!accessibility.reducedMotion)}
                  aria-pressed={accessibility.reducedMotion}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${accessibility.reducedMotion ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-app-border text-gray-400 hover:text-white'}`}
                >
                  {accessibility.reducedMotion ? t('settings_enabled') : t('settings_disabled')}
                </button>
              </div>

              <div className="rounded-lg border border-app-border bg-black/10 px-3 py-3">
                <p className="text-sm text-white font-medium">{t('settings_reading_profile')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('settings_reading_profile_desc')}</p>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'default', label: t('settings_reading_default') },
                    { value: 'mild', label: t('settings_reading_mild') },
                    { value: 'moderate', label: t('settings_reading_moderate') },
                    { value: 'strong', label: t('settings_reading_strong') },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReadingProfile(option.value as 'default' | 'mild' | 'moderate' | 'strong')}
                      aria-pressed={accessibility.readingProfile === option.value}
                      className={`text-xs px-3 py-2 rounded-lg border transition-colors ${accessibility.readingProfile === option.value ? 'border-primary-500/50 text-white bg-primary-600/20' : 'border-app-border text-gray-400 hover:text-white'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-medium mb-2">{t('settings_font_size')}</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'normal', label: t('settings_font_normal') },
                  { value: 'large', label: t('settings_font_large') },
                  { value: 'x-large', label: t('settings_font_xlarge') },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFontScale(option.value as 'normal' | 'large' | 'x-large')}
                    aria-pressed={accessibility.fontScale === option.value}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${accessibility.fontScale === option.value ? 'border-primary-500/50 bg-primary-600/20 text-white' : 'border-app-border text-gray-400 hover:text-white'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-glass rounded-2xl p-6 card-glow">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-white font-semibold flex items-center gap-2">
              <BrainCircuit size={16} className="text-primary-400" /> {t('settings_voice_profile')}
            </h2>
            <p className="text-gray-400 text-sm mt-1">{t('settings_voice_profile_desc')}</p>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${trendToneClass}`}>
            {totalWeeklySignals === 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trendLabel}
          </div>
        </div>

        {voiceProfileError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">{voiceProfileError}</div>
        )}
        {resetSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm flex items-center gap-2 mb-4">
            <Check size={15} /> {t('settings_voice_reset_ok')}
          </div>
        )}

        {voiceProfileLoading ? (
          <div className="rounded-xl border border-app-border bg-app-card/40 px-4 py-6 text-sm text-gray-400">
            {t('settings_loading_voice_profile')}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-app-border bg-app-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{t('settings_manual_layer')}</p>
                {presetLoading && <span className="text-xs text-gray-500">{t('settings_saving_preset')}</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VOICE_PRESET_OPTIONS.map((option) => {
                  const active = voicePreset === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleVoicePresetChange(option.value)}
                      disabled={presetLoading}
                      className={`text-left rounded-xl border p-3 transition-colors ${active ? 'border-primary-500/40 bg-primary-500/10' : 'border-app-border bg-black/10 hover:border-primary-500/20'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-300'}`}>{t(option.labelKey)}</span>
                        {active && <Sparkles size={14} className="text-primary-300" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t(option.descriptionKey)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-app-border bg-app-card/50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{t('settings_signal_interruptions')}</p>
                <p className="text-2xl font-bold text-white">{voiceAdaptation.interruption_count}</p>
                <p className="text-xs text-gray-500 mt-1">{t('settings_signal_interruptions')}</p>
              </div>
              <div className="rounded-xl border border-app-border bg-app-card/50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{t('settings_signal_repeats')}</p>
                <p className="text-2xl font-bold text-white">{voiceAdaptation.repeated_command_count}</p>
                <p className="text-xs text-gray-500 mt-1">{t('settings_signal_repeats')}</p>
              </div>
              <div className="rounded-xl border border-app-border bg-app-card/50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{t('settings_signal_toggles')}</p>
                <p className="text-2xl font-bold text-white">{voiceAdaptation.toggled_off_count}</p>
                <p className="text-xs text-gray-500 mt-1">{t('settings_signal_toggles')}</p>
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{t('settings_voice_trend_week')}</p>
                <span className="text-xs text-gray-500">{weeklyFeedback.length} {t('settings_days_with_history')}</span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-28">
                {last7Days.map((day) => (
                  <div key={day.key} className="flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full max-w-[28px] h-20 flex items-end">
                      <div
                        className={`w-full rounded-t-md transition-all ${day.total === 0 ? 'bg-white/10' : 'bg-gradient-to-t from-primary-700 to-cyan-400'}`}
                        style={{ height: `${Math.max(8, Math.round((day.total / maxGraphValue) * 100))}%` }}
                        title={`${day.label}: ${day.total} sinal(is) | interrupções ${day.interrupted}, repetições ${day.repeated}, desligamentos ${day.toggledOff}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase">{day.label}</p>
                      <p className="text-[10px] text-gray-500">{day.total}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">{t('settings_signal_interruptions')}</p>
                  <p className="text-white font-semibold">{weeklyTotals.interrupted}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">{t('settings_signal_repeats')}</p>
                  <p className="text-white font-semibold">{weeklyTotals.repeated}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">{t('settings_signal_toggles')}</p>
                  <p className="text-white font-semibold">{weeklyTotals.toggledOff}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-app-border bg-black/10 px-3 py-2">
                  <p className="text-gray-500 text-xs mb-1">{t('settings_current_rate_adjust')}</p>
                  <p className="text-white font-semibold">{voiceAdaptation.adaptive_offsets.rate >= 0 ? '+' : ''}{voiceAdaptation.adaptive_offsets.rate.toFixed(3)}</p>
                </div>
                <div className="rounded-lg border border-app-border bg-black/10 px-3 py-2">
                  <p className="text-gray-500 text-xs mb-1">{t('settings_current_pitch_adjust')}</p>
                  <p className="text-white font-semibold">{voiceAdaptation.adaptive_offsets.pitch >= 0 ? '+' : ''}{voiceAdaptation.adaptive_offsets.pitch.toFixed(3)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {voiceAdaptation.last_feedback_at
                  ? `${t('settings_last_signal')} ${new Date(voiceAdaptation.last_feedback_at).toLocaleString('pt-BR')}.`
                  : t('settings_no_signals')}
              </p>
            </div>

            <div className="rounded-xl border border-app-border bg-app-card/40 p-4 space-y-3">
              <p className="text-sm font-medium text-white">{t('settings_profile_reading')}</p>
              <div className="space-y-2">
                {recommendations.map((item) => (
                  <div key={item} className="rounded-lg border border-app-border bg-black/10 px-3 py-2 text-sm text-gray-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-app-border bg-app-card/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{t('settings_reset_adaptation')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('settings_reset_adaptation_desc')}</p>
              </div>
              <button
                type="button"
                onClick={handleResetVoiceAdaptation}
                disabled={resetLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15 transition-colors disabled:opacity-60"
              >
                <RotateCcw size={14} />
                {resetLoading ? t('settings_resetting') : t('settings_reset')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
