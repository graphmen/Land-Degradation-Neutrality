import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gov.zw.ema.ldn',
  appName: 'EMA Zimbabwe LDN',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
