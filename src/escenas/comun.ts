import Phaser from 'phaser';
import { multiplicador, pagarMinijuego } from '../core/estado';
import { multiplicadorCombo, ritmoDeEtapa } from '../core/minijuegos';
import { guardarPartida, juego } from '../juego';
import { fondoDeEtapa } from '../core/lugares';
import { ALTO, ANCHO, COLOR, E, boton, caja, texto } from '../ui/ui';
import { brillo, confeti, monedasHacia, polvo, texturasFx } from '../ui/efectos';

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
  // Pausa (R023): botón arriba al centro; también se pausa sola si la app pasa a segundo plano.
  esc.data.set('minijuego', true);
  esc.data.set('terminado', false);
  const pausa = boton(esc, 222, 6, 36, 22, 'II', () => pausar(esc), 13);
  pausa.cont.setDepth(45);
  const alOcultar = () => {
    if (document.visibilityState === 'hidden') pausar(esc);
  };
  document.addEventListener('visibilitychange', alOcultar);
  esc.events.once('shutdown', () => document.removeEventListener('visibilitychange', alOcultar));
  esc.data.set('botonPausa', pausa.cont);
  // Entrada suave a la changa.
  esc.cameras.main.fadeIn(260, 11, 8, 18);
  texturasFx(esc);
  // Marcador que cuenta hasta el valor nuevo, late y se colorea según suba o baje (R028).
  let mostrado = 0;
  let objetivo = 0;
  const cuenta = { v: 0 };
  let ultimoSegundo = -1;
  return {
    puntos: (n) => {
      if (n === objetivo) return;
      const sube = n > objetivo;
      objetivo = n;
      esc.tweens.killTweensOf(cuenta);
      cuenta.v = mostrado;
      esc.tweens.add({
        targets: cuenta, v: n, duration: 380, ease: 'Cubic.easeOut',
        onUpdate: () => {
          mostrado = Math.round(cuenta.v);
          pts.setText(`Puntos: ${mostrado}`);
        },
      });
      pts.setColor(sube ? COLOR.verde : COLOR.rojo);
      esc.tweens.killTweensOf(pts);
      pts.setScale(1);
      esc.tweens.add({ targets: pts, scale: 1.18, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => pts.setColor(COLOR.oro) });
    },
    tiempo: (s) => {
      reloj.setText(typeof s === 'string' ? s : `Tiempo: ${s} s`);
      // Últimos 5 segundos: el reloj se pone rojo y late.
      if (typeof s === 'number' && s !== ultimoSegundo) {
        ultimoSegundo = s;
        if (s <= 5 && s > 0) {
          reloj.setColor(COLOR.rojo);
          esc.tweens.add({ targets: reloj, scale: 1.25, duration: 110, yoyo: true });
        } else reloj.setColor(COLOR.tinta);
      }
    },
  };
}

/** Aviso grande al empezar, que desaparece solo. */
export function aviso(esc: Phaser.Scene, s: string, ms = 1600): void {
  const t = texto(esc, ANCHO / 2, ALTO / 2, s, { tam: 16, alinear: 'center', ancho: 360 }).setOrigin(0.5).setDepth(60);
  t.setScale(0.6).setAlpha(0);
  esc.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  esc.tweens.add({ targets: t, alpha: 0, y: t.y - 10 * E, delay: Math.max(0, ms - 250), duration: 250, onComplete: () => t.destroy() });
}

/** Número que sube y se desvanece. */
export function flotar(esc: Phaser.Scene, s: string, x: number, y: number, bueno: boolean, efecto = true): void {
  // Cada acierto suelta estrellitas; cada error, polvo (R028).
  if (efecto) (bueno ? brillo : polvo)(esc, x * E, (y + 8) * E);
  const f = texto(esc, x, y, s, { tam: 14, color: bueno ? COLOR.verde : COLOR.rojo }).setOrigin(0.5).setDepth(50);
  // Aparece con un saltito, sube despacio y se desvanece al final (R028).
  f.setScale(0.5);
  esc.tweens.add({ targets: f, scale: 1, duration: 180, ease: 'Back.easeOut' });
  esc.tweens.add({ targets: f, y: f.y - 24 * E, x: f.x + Phaser.Math.Between(-4, 4) * E, duration: 900, ease: 'Cubic.easeOut' });
  esc.tweens.add({ targets: f, alpha: 0, delay: 550, duration: 350, onComplete: () => f.destroy() });
}

/**
 * Combo de aciertos seguidos (R025): `acierto()` devuelve los puntos multiplicados y avisa al subir de nivel;
 * `error()` lo corta. Se muestra arriba al centro, debajo de la pausa.
 */
export class Combo {
  private racha = 0;
  private cartel: Phaser.GameObjects.Text;

  constructor(private esc: Phaser.Scene) {
    this.cartel = texto(esc, 240, 31, '', { tam: 12, color: COLOR.oro }).setOrigin(0.5, 0).setDepth(45);
  }

  acierto(puntos: number): number {
    const antes = multiplicadorCombo(this.racha);
    this.racha += 1;
    const m = multiplicadorCombo(this.racha);
    this.cartel.setText(m > 1 ? `Combo ×${m} (${this.racha} seguidos)` : '');
    if (m > antes) {
      this.esc.tweens.add({ targets: this.cartel, scale: { from: 1.6, to: 1 }, duration: 250, ease: 'Back.easeOut' });
      this.esc.cameras.main.flash(120, 255, 210, 90, false);
      confeti(this.esc, 240 * E, 40 * E, 14);
    }
    return Math.round(puntos * m);
  }

  error(): void {
    if (this.racha >= 3) flotar(this.esc, 'Se cortó el combo', 240, 46, false);
    this.racha = 0;
    this.cartel.setText('');
  }
}

/** Ritmo de esta changa según la etapa actual de Rupert. */
export function ritmo(): number {
  return ritmoDeEtapa(juego.e.etapa);
}

/** Pausa la changa (si sigue en juego): congela su reloj, animaciones y física, y abre la pantalla de pausa. */
export function pausar(esc: Phaser.Scene): void {
  if (esc.data.get('terminado') || !esc.scene.isActive() || esc.scene.isActive('Pausa')) return;
  esc.scene.launch('Pausa', { de: esc.scene.key });
  esc.scene.pause();
}

/** Paga los puntos según el cuidado de Rupert y muestra el resultado con el botón Volver. */
export function terminarMinijuego(esc: Phaser.Scene, puntos: number, detalle = ''): number {
  esc.data.set('terminado', true);
  (esc.data.get('botonPausa') as Phaser.GameObjects.Container | undefined)?.setVisible(false);
  const pago = pagarMinijuego(juego.e, puntos);
  guardarPartida();
  // Fondo que se oscurece detrás del cartel.
  const velo = esc.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, 0.6).setOrigin(0).setDepth(99).setInteractive().setAlpha(0);
  esc.tweens.add({ targets: velo, alpha: 1, duration: 250 });
  const capa = esc.add.container(0, 0).setDepth(100);
  const g = esc.add.graphics();
  caja(g, 120, 66, 240, 128, COLOR.panel);
  capa.add(g);
  capa.add(texto(esc, 240, 74, '¡Terminó la changa!', { tam: 16, color: COLOR.oro }).setOrigin(0.5, 0));
  const lineas = [detalle, `Puntos: ${puntos}`, `Rendimiento x${multiplicador(juego.e).toFixed(2)}`, `Ganaste ${pago} monedas`].filter(Boolean).join('\n');
  capa.add(texto(esc, 240, 96, lineas, { tam: 12, alinear: 'center' }).setOrigin(0.5, 0));
  const volver = boton(esc, 195, 166, 90, 22, 'Volver', () => {
    esc.cameras.main.fadeOut(220, 11, 8, 18);
    esc.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => esc.scene.start('Hogar'));
  });
  capa.add(volver.cont);
  // El cartel entra con un rebote; si se ganó algo, confeti y monedas que vuelan (R028).
  capa.setScale(0.7).setAlpha(0);
  capa.setPosition(240 * E * 0.3, 130 * E * 0.3);
  esc.tweens.add({ targets: capa, scale: 1, alpha: 1, x: 0, y: 0, duration: 320, ease: 'Back.easeOut' });
  if (pago > 0) {
    esc.time.delayedCall(250, () => {
      confeti(esc, 240 * E, 70 * E);
      monedasHacia(esc, 240 * E, 140 * E, 40 * E, 20 * E, Math.min(10, 3 + Math.floor(pago / 10)));
    });
  }
  return pago;
}
