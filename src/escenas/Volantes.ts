import Phaser from 'phaser';
import { PEATONES, type Peaton, entregarVolante, esperaPeaton } from '../core/changas';
import { juego } from '../juego';
import { E } from '../ui/ui';
import { Combo, ritmo, type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 45_000;
const PISO = 262;
/** Zona frente a Rupert donde se puede dar el volante (px del mundo). */
const ZONA = { x0: 168, x1: 262 };

interface Caminante {
  p: Peaton;
  spr: Phaser.GameObjects.Sprite;
  atendido: boolean;
}

/** Repartir volantes en la plaza: tocar a cada peatón cuando pasa frente a Rupert, sin molestar a los apurados. */
export class Volantes extends Phaser.Scene {
  private puntos = 0;
  private entregados = 0;
  private reloj = 0;
  private fin = 0;
  private proximo = 0;
  private terminado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private gente: Caminante[] = [];
  private rupert?: Phaser.GameObjects.Sprite;

  constructor() {
    super('Volantes');
  }

  create(): void {
    this.puntos = 0;
    this.entregados = 0;
    this.reloj = 0;
    this.terminado = false;
    this.gente = [];
    this.fin = DURACION + 1500;
    this.proximo = 1500;
    this.marcador = montarMinijuego(this, 'Repartir volantes', 0.15);
    this.combo = new Combo(this);

    // Zona de entrega, marcada en el piso.
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0xffd25a, 0.18).fillRect(ZONA.x0 * E, (PISO - 14) * E, (ZONA.x1 - ZONA.x0) * E, 18 * E);
    g.lineStyle(E, 0xffd25a, 0.7).strokeRect(ZONA.x0 * E, (PISO - 14) * E, (ZONA.x1 - ZONA.x0) * E, 18 * E);

    const clave = `e${juego.e.etapa}_quieto_34`;
    if (this.textures.exists(clave)) {
      // Rupert queda detrás de la vereda por donde camina la gente, mirando la zona de entrega.
      this.rupert = this.add.sprite(215 * E, (PISO - 24) * E, clave, 0).setOrigin(0.5, 1).setDepth(PISO - 24);
      // Mira a la izquierda, de donde vienen los peatones.
      this.rupert.setScale((80 * E) / this.rupert.height).setFlipX(true);
      if (this.anims.exists(clave)) this.rupert.play(clave);
    }
    aviso(this, 'Toca a cada persona cuando pase\nfrente a Rupert (zona amarilla).\nNo molestes a quien va apurado. Se enojan.', 2400);
  }

  private nuevoPeaton(): void {
    // Tres de cada cuatro aceptan volantes; el resto va apurado o no escucha.
    const grupo = PEATONES.filter((x) => x.acepta === Math.random() < 0.75);
    const p = grupo[Math.floor(Math.random() * grupo.length)];
    const spr = this.add.sprite(-30 * E, PISO * E, `peaton${p.hoja}`, 0).setOrigin(0.5, 1).setScale(E).setDepth(PISO + 1);
    spr.play(`peaton${p.hoja}_caminar`);
    spr.setInteractive({ useHandCursor: true });
    const c: Caminante = { p, spr, atendido: false };
    spr.on('pointerdown', () => this.tocar(c));
    this.gente.push(c);
  }

  private tocar(c: Caminante): void {
    if (this.terminado || c.atendido) return;
    const x = c.spr.x / E;
    const enZona = x >= ZONA.x0 && x <= ZONA.x1;
    const r = entregarVolante(c.p, enZona);
    if (r.resultado === 'entregado') r.puntos = this.combo.acierto(r.puntos);
    else this.combo.error();
    this.puntos = Math.max(0, this.puntos + r.puntos);
    this.marcador.puntos(this.puntos);
    if (r.resultado === 'entregado') {
      c.atendido = true;
      this.entregados += 1;
      c.spr.anims.stop();
      c.spr.setFrame(4);
      // El volante vuela de Rupert a la mano del peatón.
      const v = this.add.image(207 * E, (PISO - 70) * E, 'volante').setScale(E * 1.5).setDepth(PISO + 2);
      this.tweens.add({ targets: v, x: c.spr.x + 22 * E, y: c.spr.y - 40 * E, duration: 220, onComplete: () => this.tweens.add({ targets: v, alpha: 0, delay: 250, duration: 200, onComplete: () => v.destroy() }) });
      flotar(this, `+${r.puntos} ¡Gracias!`, x, PISO - 84, true);
      this.time.delayedCall(700, () => {
        if (c.spr.active) c.spr.play(`peaton${c.p.hoja}_caminar`);
      });
    } else if (r.resultado === 'rechazado') {
      c.atendido = true;
      flotar(this, `${r.puntos} ${c.p.excusa ?? ''}`, x, PISO - 84, false);
    } else {
      flotar(this, `${r.puntos} ¡Muy lejos!`, x, PISO - 84, false);
    }
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    const parado = (c: Caminante) => c.spr.anims.isPlaying === false && c.atendido && c.p.acepta;
    for (const c of this.gente) {
      if (!parado(c)) c.spr.x += c.p.velocidad * ritmo() * (dt / 1000) * E;
    }
    for (const c of this.gente.filter((c) => c.spr.x > 520 * E)) c.spr.destroy();
    this.gente = this.gente.filter((c) => c.spr.active);
    if (this.terminado) return;

    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (this.reloj >= this.proximo && resta > 2500) {
      this.nuevoPeaton();
      const s = (this.reloj - 1500) / 1000;
      this.proximo = this.reloj + (esperaPeaton(s) * 1000 * (0.75 + Math.random() * 0.5)) / ritmo();
    }
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Entregaste ${this.entregados} volantes`);
    }
  }
}
