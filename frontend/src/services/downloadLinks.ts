const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};

export const DOWNLOAD_LINKS = {
  androidApk: '/download/app-planodeestudos-android.apk',
  iosInstall: viteEnv.VITE_IOS_INSTALL_URL || 'https://testflight.apple.com',
};
