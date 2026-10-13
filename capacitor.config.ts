import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.calculadorapreco.app',
  appName: 'Calculadora de Preço',
  webDir: 'dist/calculadora-preco/browser',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      androidBiometric: { biometricAuth: false },
    },
  },
};

export default config;

