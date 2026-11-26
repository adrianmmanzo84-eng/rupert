import Phaser from 'phaser';
import { VISITAS } from '../core/lugares';
import { HITOS } from '../core/textos';
import { COLOR, E, texto } from '../ui/ui';

/**
 * Visita corta a otro lugar al cumplir un hito (barbería en la etapa 2, biblioteca en la 4):
 * Rupert aparece con su aspecto nuevo y un cartel cuenta qué pasó. Tocar sigue al hogar.
 */
export class Visita extends Phaser.Scene {
  constructor() {
    super('Visita');
  }

  create(datos: { etapa: number }): void {
    const v = VISITAS[datos.etapa];
    if (!v) {
      this.scene.start('Hogar');
      return;
    }
    this.cameras.main.fadeIn(600);
    this.add.image(0, 0, v.fondo).setOrigin(0).setScale(E);
    const clave = `e${datos.etapa}_quieto_frente`;
    if (this.textures.exists(clave)) this.add.sprite(v.x * E, v.y * E, clave, 0).setOrigin(0.5, 1).setScale(E * v.escala);
    texto(this, 240, 20, `¡Meta cumplida!\n${HITOS[datos.etapa] ?? ''}`, { tam: 16, color: COLOR.oro, alinear: 'center', ancho: 420 })
      .setOrigin(0.5, 0)
      .setBackgroundColor('#1b1424dd')
      .setPadding(10 * E, 5 * E, 10 * E, 5 * E);
    texto(this, 240, 214, v.texto, { tam: 12, alinear: 'center', ancho: 400 })
      .setOrigin(0.5, 0)
      .setBackgroundColor('#1b1424cc')
      .setPadding(8 * E, 4 * E, 8 * E, 4 * E);
    const sigue = texto(this, 240, 252, 'Toca para seguir', { tam: 10, color: '#c9b9a6' }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: sigue, alpha: 1, delay: 1500, duration: 400, yoyo: true, repeat: -1, hold: 600 });
    let listo = false;
    const seguir = () => {
      if (listo) return;
      listo = true;
      this.cameras.main.fadeOut(500);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Hogar'));
    };
    this.time.delayedCall(1200, () => this.input.once('pointerdown', seguir));
    this.time.delayedCall(9000, seguir);
  }
}
