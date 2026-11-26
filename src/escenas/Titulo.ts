import Phaser from 'phaser';
import { nombreBarrio } from '../core/barrios';
import { metaActual } from '../core/estado';
import { fondoDeEtapa } from '../core/lugares';
import { HITOS } from '../core/textos';
import { MODO_PRUEBAS, juego } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, texto } from '../ui/ui';
import { abrirAjustes } from './ajustes';

/** Pantalla de título: Rupert en su lugar actual, cómo va la meta del mundo y los botones para empezar. */
export class Titulo extends Phaser.Scene {
  constructor() {
    super('Titulo');
  }

  create(): void {
    const e = juego.e;
    this.add.image(0, 0, fondoDeEtapa(e.etapa)).setOrigin(0).setScale(E);
    this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, 0.55).setOrigin(0);

    // Título con un poco de rebote.
    const t1 = texto(this, 240, 24, 'RUPERT', { tam: 46, color: COLOR.oro }).setOrigin(0.5, 0);
    texto(this, 240, 66, 'Road to Progress', { tam: 18 }).setOrigin(0.5, 0);
    texto(this, 240, 88, `Entre todos sacamos adelante a Rupert · ${nombreBarrio(e.barrio)}, ${juego.vecinos}/${juego.cupo} vecinos`, { tam: 11, color: '#c9b9a6' }).setOrigin(0.5, 0);
    this.tweens.add({ targets: t1, y: t1.y - 3 * E, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const clave = `e${e.etapa}_quieto_frente`;
    if (this.textures.exists(clave)) {
      const r = this.add.sprite(96 * E, 252 * E, clave, 0).setOrigin(0.5, 1);
      r.setScale((130 * E) / r.height);
      if (this.anims.exists(clave)) r.play(clave);
    }

    // Cómo va la meta mundial.
    const meta = metaActual(e);
    const g = this.add.graphics();
    const x0 = 190;
    const w = 250;
    g.fillStyle(0x140e1c, 0.85).fillRoundedRect((x0 - 6) * E, 112 * E, (w + 12) * E, 44 * E, 4 * E);
    if (meta === null) {
      texto(this, x0 + w / 2, 126, '¡Rupert cumplió todas las metas!', { tam: 12, color: COLOR.verde }).setOrigin(0.5, 0);
    } else {
      const f = Math.min(1, e.fondo / meta);
      texto(this, x0, 115, `Próxima meta: ${HITOS[e.etapa + 1] ?? ''}`, { tam: 10, ancho: w });
      g.fillStyle(0x000000, 0.7).fillRect(x0 * E, 140 * E, w * E, 9 * E);
      g.fillStyle(0xffb347, 1).fillRect((x0 + 1) * E, 141 * E, (w - 2) * f * E, 7 * E);
      texto(this, x0 + w, 128, `${Math.floor(e.fondo)} / ${meta} PA`, { tam: 10, color: COLOR.oro }).setOrigin(1, 0);
    }

    boton(this, 226, 170, 180, 30, 'Jugar', () => this.jugar(), 16);
    boton(this, 226, 206, 86, 22, 'Fondo', () => this.scene.start('Fondo', { volver: 'Titulo' }), 12);
    boton(this, 320, 206, 86, 22, 'Ajustes', () => abrirAjustes(this, () => this.scene.restart()), 12);
    texto(this, 316, 236, `Racha: ${e.racha} ${e.racha === 1 ? 'día' : 'días'} · Aportaste ${Math.floor(e.aportado)} PA`, { tam: 10, color: '#c9b9a6' }).setOrigin(0.5, 0);
    texto(this, ANCHO - 4, ALTO - 12, `v${__VERSION__}${MODO_PRUEBAS ? ' · MODO PRUEBAS' : ''}`, { tam: 9, color: '#8a7f99' }).setOrigin(1, 0);
  }

  private jugar(): void {
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.registry.set('entrando', true);
      this.scene.start('Hogar');
    });
  }
}
