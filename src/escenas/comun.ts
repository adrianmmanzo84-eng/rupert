import Phaser from 'phaser';
import { multiplicador, pagarMinijuego } from '../core/estado';
import { guardarPartida, juego } from '../juego';
import { fondoDeEtapa } from '../core/lugares';
import { ALTO, ANCHO, COLOR, E, boton, caja, texto } from '../ui/ui';

export interface Marcador {
  puntos(n: number): void;
  tiempo(segundos: number | string): void;
}

/** Fondo oscurecido del lugar actual, marcador de puntos y tiempo, y rendimiento de Rupert. */
export function montarMinijuego(esc: Phaser.Scene, titulo: string, oscuro = 0.45, fondoDelLugar = true): Marcador {
  if (fondoDelLugar) esc.add.image(0, 0, fondoDeEtapa(juego.e.etapa)).setOrigin(0).setScale(E);
  esc.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, oscuro).setOrigin(0);
  const g = esc.add.graphics().setDepth(40);
  caja(g, 4, 4, 150, 34, COLOR.panel);
  const pts = texto(esc, 12, 6, 'Puntos: 0', { tam: 14, color: COLOR.oro }).setDepth(41);
  const reloj = texto(esc, 12, 20, '', { tam: 11 }).setDepth(41);
  texto(esc, ANCHO - 6, 6, titulo, { tam: 12, color: COLOR.oro }).setOrigin(1, 0).setDepth(41);
  texto(esc, ANCHO - 6, 20, `Rendimiento de Rupert x${multiplicador(juego.e).toFixed(2)}`, { tam: 10, color: '#c9b9a6' }).setOrigin(1, 0).setDepth(41);
  return {
    puntos: (n) => pts.setText(`Puntos: ${n}`),
    tiempo: (s) => reloj.setText(typeof s === 'string' ? s : `Tiempo: ${s} s`),
  };
}

/** Aviso grande al empezar, que desaparece solo. */
export function aviso(esc: Phaser.Scene, s: string, ms = 1600): void {
  const t = texto(esc, ANCHO / 2, ALTO / 2, s, { tam: 16, alinear: 'center', ancho: 360 }).setOrigin(0.5).setDepth(60);
  esc.time.delayedCall(ms, () => t.destroy());
}

/** Número que sube y se desvanece. */
export function flotar(esc: Phaser.Scene, s: string, x: number, y: number, bueno: boolean): void {
  const f = texto(esc, x, y, s, { tam: 14, color: bueno ? COLOR.verde : COLOR.rojo }).setOrigin(0.5).setDepth(50);
  esc.tweens.add({ targets: f, y: f.y - 20 * E, alpha: 0, duration: 700, onComplete: () => f.destroy() });
}

/** Paga los puntos según el cuidado de Rupert y muestra el resultado con el botón Volver. */
export function terminarMinijuego(esc: Phaser.Scene, puntos: number, detalle = ''): number {
  const pago = pagarMinijuego(juego.e, puntos);
  guardarPartida();
  const capa = esc.add.container(0, 0).setDepth(100);
  const g = esc.add.graphics();
  caja(g, 120, 66, 240, 128, COLOR.panel);
  capa.add(g);
  capa.add(texto(esc, 240, 74, '¡Terminó la changa!', { tam: 16, color: COLOR.oro }).setOrigin(0.5, 0));
  const lineas = [detalle, `Puntos: ${puntos}`, `Rendimiento x${multiplicador(juego.e).toFixed(2)}`, `Ganaste ${pago} monedas`].filter(Boolean).join('\n');
  capa.add(texto(esc, 240, 96, lineas, { tam: 12, alinear: 'center' }).setOrigin(0.5, 0));
  capa.add(boton(esc, 195, 166, 90, 22, 'Volver', () => esc.scene.start('Hogar')).cont);
  return pago;
}
