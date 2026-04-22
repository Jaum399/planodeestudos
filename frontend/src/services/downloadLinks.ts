const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

function getSafeAndroidDownloadUrl(rawUrl?: string) {
  const fallback = 'https://github.com/Jaum399/planodeestudos/releases';
  const candidate = String(rawUrl || '').trim();
  if (!candidate) return fallback;
  if (/^\/download\//i.test(candidate)) return fallback;
  return candidate;
}

function getSafeIosInstallUrl(rawUrl?: string) {
  const fallback = 'https://testflight.apple.com';
  const candidate = String(rawUrl || '').trim();
  if (!candidate) return fallback;
  if (/\.zip($|\?)/i.test(candidate)) return fallback;
  return candidate;
}

export const DOWNLOAD_LINKS = {
  androidApk: getSafeAndroidDownloadUrl(viteEnv.VITE_ANDROID_DOWNLOAD_URL),
  iosInstall: getSafeIosInstallUrl(viteEnv.VITE_IOS_INSTALL_URL),
};
