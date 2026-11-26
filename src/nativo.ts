import type Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { cerrarUltimoPanel } from './ui/ui';

/**
 * App de Android (R019). En el navegador nada de esto corre.
 * Botón Atrás del teléfono: cierra el panel o menú abierto; en un minijuego o una visita vuelve al hogar
 * (sin cobrar la changa); en el hogar sin nada abierto, va al título; en el título, minimiza la app.
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
    const actual = juego.scene.getScenes(true).find((s) => s.scene.key !== 'Arranque') as (Phaser.Scene & { atras?: () => boolean }) | undefined;
    if (!actual) return;
    // Cada pantalla puede resolver Atrás por su cuenta (cerrar un menú, salir del fondo...).
    if (actual.atras?.()) return;
    if (actual.scene.key === 'Titulo') void App.minimizeApp();
    else if (actual.scene.key === 'Hogar') actual.scene.start('Titulo');
    else actual.scene.start('Hogar');
  });
}
