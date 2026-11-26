import type Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { cerrarUltimoPanel } from './ui/ui';

/**
 * App de Android (R019). En el navegador nada de esto corre.
 * Botón Atrás del teléfono: cierra el panel o menú abierto; en un minijuego o una visita vuelve al hogar
 * (sin cobrar la changa); en el hogar sin nada abierto, minimiza la app.
 */
export const esNativo = Capacitor.isNativePlatform();

export function iniciarNativo(juego: Phaser.Game, guardar: () => void): void {
  if (!esNativo) return;
  document.body.classList.add('nativo');
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) guardar();
  });
  void App.addListener('backButton', () => {
    if (cerrarUltimoPanel()) return;
    const activas = juego.scene.getScenes(true);
    const hogar = activas.find((s) => s.scene.key === 'Hogar') as (Phaser.Scene & { atras(): boolean }) | undefined;
    if (hogar) {
      if (!hogar.atras()) void App.minimizeApp();
      return;
    }
    const actual = activas.find((s) => s.scene.key !== 'Arranque');
    actual?.scene.start('Hogar');
  });
}
