import { useState } from 'react';
import { Accessibility } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';

const READING_OPTIONS = ['default', 'mild', 'moderate', 'strong'] as const;

export default function AccessibilityOnboarding() {
  const {
    isAccessibilityOnboardingOpen,
    closeAccessibilityOnboarding,
    setReadingProfile,
    t,
  } = usePreferences();
  const [selectedProfile, setSelectedProfile] = useState<(typeof READING_OPTIONS)[number]>('mild');

  if (!isAccessibilityOnboardingOpen) {
    return null;
  }

  const handleApply = () => {
    setReadingProfile(selectedProfile);
    closeAccessibilityOnboarding();
  };

  const handleKeepDefault = () => {
    setReadingProfile('default');
    closeAccessibilityOnboarding();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-app-border bg-app-surface p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center">
            <Accessibility size={18} className="text-primary-300" />
          </div>
          <div>
            <h2 className="text-white text-lg sm:text-xl font-semibold">{t('accessibility_onboarding_title')}</h2>
            <p className="text-gray-400 text-sm mt-1">{t('accessibility_onboarding_desc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          {READING_OPTIONS.map((option) => {
            const labelKey =
              option === 'default'
                ? 'settings_reading_default'
                : option === 'mild'
                  ? 'settings_reading_mild'
                  : option === 'moderate'
                    ? 'settings_reading_moderate'
                    : 'settings_reading_strong';

            return (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedProfile(option)}
                aria-pressed={selectedProfile === option}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${selectedProfile === option ? 'border-primary-500/50 bg-primary-600/20 text-white' : 'border-app-border text-gray-400 hover:text-white'}`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button type="button" onClick={handleApply} className="btn-primary justify-center text-sm w-full">
            {t('accessibility_onboarding_apply')}
          </button>
          <button type="button" onClick={handleKeepDefault} className="btn-secondary justify-center text-sm w-full">
            {t('accessibility_onboarding_keep_default')}
          </button>
          <button type="button" onClick={closeAccessibilityOnboarding} className="text-gray-400 hover:text-white text-sm px-2 py-2">
            {t('accessibility_onboarding_later')}
          </button>
        </div>
      </div>
    </div>
  );
}
