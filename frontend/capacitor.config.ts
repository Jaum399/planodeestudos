import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.planodeestudos.app',
  appName: 'Ordex',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
