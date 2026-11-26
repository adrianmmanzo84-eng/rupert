import type Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { cerrarUltimoPanel } from './ui/ui';
import { pausar } from './escenas/comun';

/**
 * App de Android (R019). En el navegador nada de esto corre.
 * Botón Atrás del teléfono: cierra el panel o menú abierto; en una changa en juego la pausa; en una visita o
 * una changa terminada vuelve al hogar; en el hogar sin nada abierto, va al título; en el título, minimiza la app.
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
    // La pausa va encima de la changa: si está abierta, es la que responde.
    const activas = juego.scene.getScenes(true);
    const actual = (activas.find((s) => s.scene.key === 'Pausa') ?? activas.find((s) => s.scene.key !== 'Arranque')) as (Phaser.Scene & { atras?: () => boolean }) | undefined;
    if (!actual) return;
    // Cada pantalla puede resolver Atrás por su cuenta (cerrar un menú, salir del fondo...).
    if (actual.atras?.()) return;
    // En una changa en juego, Atrás pausa (desde la pausa se puede salir).
    if (actual.data.get('minijuego') && !actual.data.get('terminado')) {
      pausar(actual);
      return;
    }
    if (actual.scene.key === 'Titulo') void App.minimizeApp();
    else if (actual.scene.key === 'Hogar') actual.scene.start('Titulo');
    else actual.scene.start('Hogar');
  });
}
