import { Languages, Moon, Sun } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';

type PublicPreferenceControlsProps = {
  compact?: boolean;
  className?: string;
};

export default function PublicPreferenceControls({ compact = false, className = '' }: PublicPreferenceControlsProps) {
  const { theme, toggleTheme, language, setLanguage, t } = usePreferences();

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
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
    </div>
  );
}