import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dot-confidence.app',
  appName: 'dot-confidence',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  }
};

export default config;
