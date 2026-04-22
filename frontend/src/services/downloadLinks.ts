const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

function getSafeIosInstallUrl(rawUrl?: string) {
  const fallback = 'https://testflight.apple.com';
  const candidate = String(rawUrl || '').trim();
  if (!candidate) return fallback;
  if (/\.zip($|\?)/i.test(candidate)) return fallback;
  return candidate;
}

export const DOWNLOAD_LINKS = {
  androidApk: '/download/app-planodeestudos-android.apk',
  iosInstall: getSafeIosInstallUrl(viteEnv.VITE_IOS_INSTALL_URL),
};
