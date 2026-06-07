import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PreferencesProvider, usePreferences } from '../src/contexts/PreferencesContext';

function PreferencesHarness() {
  const {
    accessibility,
    isAccessibilityOnboardingOpen,
    setHighContrast,
    setReducedMotion,
    setReadingProfile,
    setFontScale,
    closeAccessibilityOnboarding,
  } = usePreferences();

  return (
    <div>
      <span data-testid="reading-profile">{accessibility.readingProfile}</span>
      <span data-testid="onboarding-open">{String(isAccessibilityOnboardingOpen)}</span>

      <button onClick={() => setHighContrast(true)}>high-contrast-on</button>
      <button onClick={() => setReducedMotion(true)}>reduced-motion-on</button>
      <button onClick={() => setReadingProfile('strong')}>reading-strong</button>
      <button onClick={() => setFontScale('x-large')}>font-x-large</button>
      <button onClick={() => closeAccessibilityOnboarding()}>close-onboarding</button>
    </div>
  );
}

describe('PreferencesContext', () => {
  it('aplica classes e estados a partir do localStorage', () => {
    localStorage.setItem('app.accessibility.highContrast', 'true');
    localStorage.setItem('app.accessibility.reducedMotion', 'true');
    localStorage.setItem('app.accessibility.readingProfile', 'moderate');
    localStorage.setItem('app.accessibility.fontScale', 'large');
    localStorage.setItem('app.accessibility.onboardingSeen', 'true');

    render(
      <PreferencesProvider>
        <PreferencesHarness />
      </PreferencesProvider>
    );

    expect(document.body.classList.contains('accessibility-high-contrast')).toBe(true);
    expect(document.body.classList.contains('accessibility-reduced-motion')).toBe(true);
    expect(document.body.classList.contains('accessibility-reading-moderate')).toBe(true);
    expect(document.documentElement.classList.contains('font-scale-large')).toBe(true);
    expect(screen.getByTestId('onboarding-open')).toHaveTextContent('false');
  });

  it('persiste mudanças de acessibilidade e controla onboarding', () => {
    render(
      <PreferencesProvider>
        <PreferencesHarness />
      </PreferencesProvider>
    );

    fireEvent.click(screen.getByText('high-contrast-on'));
    fireEvent.click(screen.getByText('reduced-motion-on'));
    fireEvent.click(screen.getByText('reading-strong'));
    fireEvent.click(screen.getByText('font-x-large'));

    expect(localStorage.getItem('app.accessibility.highContrast')).toBe('true');
    expect(localStorage.getItem('app.accessibility.reducedMotion')).toBe('true');
    expect(localStorage.getItem('app.accessibility.readingProfile')).toBe('strong');
    expect(localStorage.getItem('app.accessibility.fontScale')).toBe('x-large');
    expect(document.body.classList.contains('accessibility-reading-strong')).toBe(true);
    expect(screen.getByTestId('reading-profile')).toHaveTextContent('strong');

    expect(screen.getByTestId('onboarding-open')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('close-onboarding'));
    expect(localStorage.getItem('app.accessibility.onboardingSeen')).toBe('true');
    expect(screen.getByTestId('onboarding-open')).toHaveTextContent('false');
  });
});
