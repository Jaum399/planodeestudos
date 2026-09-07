import { Accessibility, Languages, Moon, Sun } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';

type PublicPreferenceControlsProps = {
  compact?: boolean;
  className?: string;
};

export default function PublicPreferenceControls({ compact = false, className = '' }: PublicPreferenceControlsProps) {
  const { theme, toggleTheme, language, setLanguage, accessibility, setHighContrast, setReducedMotion, setReadingProfile, setFontScale, t } = usePreferences();
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsAccessibilityOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAccessibilityOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className={`flex items-center gap-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={toggleTheme}
        title={t('theme_toggle')}
        aria-label={t('theme_toggle')}
        className={`public-control-btn ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="relative">
        <Languages size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'pt' | 'en' | 'es' | 'ca')}
          title={t('language_label')}
          aria-label={t('language_label')}
          className={`public-control-select ${compact ? 'h-9 pl-9 pr-8 text-xs min-w-[92px]' : 'h-10 pl-9 pr-9 text-sm min-w-[110px]'}`}
        >
          <option value="pt">PT</option>
          <option value="en">EN</option>
          <option value="es">ES</option>
          <option value="ca">CA</option>
        </select>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsAccessibilityOpen((prev) => !prev)}
          title={t('settings_accessibility')}
          aria-label={t('settings_accessibility')}
          aria-expanded={isAccessibilityOpen}
          aria-controls={panelId}
          className={`public-control-btn ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}
        >
          <Accessibility size={16} />
        </button>

        {isAccessibilityOpen && (
          <div
            id={panelId}
            className="public-accessibility-panel absolute right-0 top-full mt-2 w-[min(92vw,19rem)] rounded-2xl border border-app-border bg-app-surface/95 p-4 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-label={t('settings_accessibility')}
          >
            <div className="mb-3">
              <p className="text-sm font-semibold text-white">{t('settings_accessibility')}</p>
              <p className="mt-1 text-xs text-gray-500">{t('settings_accessibility_desc')}</p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setHighContrast(!accessibility.highContrast)}
                aria-pressed={accessibility.highContrast}
                className="public-accessibility-option"
              >
                <span>
                  <span className="block text-sm font-medium text-white">{t('settings_high_contrast')}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{t('settings_high_contrast_desc')}</span>
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${accessibility.highContrast ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-app-border text-gray-400'}`}>
                  {accessibility.highContrast ? t('settings_enabled') : t('settings_disabled')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReducedMotion(!accessibility.reducedMotion)}
                aria-pressed={accessibility.reducedMotion}
                className="public-accessibility-option"
              >
                <span>
                  <span className="block text-sm font-medium text-white">{t('settings_reduce_motion')}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{t('settings_reduce_motion_desc')}</span>
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${accessibility.reducedMotion ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-app-border text-gray-400'}`}>
                  {accessibility.reducedMotion ? t('settings_enabled') : t('settings_disabled')}
                </span>
              </button>

              <div className="public-accessibility-option">
                <span>
                  <span className="block text-sm font-medium text-white">{t('settings_reading_profile')}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{t('settings_reading_profile_desc')}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${accessibility.readingProfile === option.value ? 'border-primary-500/50 bg-primary-600/20 text-white' : 'border-app-border text-gray-400 hover:text-white'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-gray-500">{t('settings_font_size')}</p>
              <div className="grid grid-cols-3 gap-2">
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
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${accessibility.fontScale === option.value ? 'border-primary-500/50 bg-primary-600/20 text-white' : 'border-app-border text-gray-400 hover:text-white'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}