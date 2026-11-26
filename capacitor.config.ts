import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App de Android (R019). El juego web (dist/) va dentro de la app: funciona sin internet.
 * appId PROVISORIO: es el nombre del paquete en Google Play y no se puede cambiar después de publicar.
 */
const config: CapacitorConfig = {
  appId: 'com.rupert.roadtoprogress',
  appName: 'Rupert',
  webDir: 'dist',
  android: {
    backgroundColor: '#140e1c',
    // Sin depuración remota en las versiones de la tienda.
    webContentsDebuggingEnabled: false,
  },
};

export default config;
