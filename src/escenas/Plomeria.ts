import Phaser from 'phaser';
import { ES, N, O, S, type Canerias, aguaLlega, girar, nivelCanerias, puntosCanerias } from '../core/rompecabezas';
import { E, texto } from '../ui/ui';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, ritmo, terminarMinijuego } from './comun';

const DURACION = 60_000;
/** Segundos extra por cada cañería resuelta. */
const PREMIO_TIEMPO = 6_000;

/**
 * Changa de plomería (R026): girar los caños tocándolos hasta que el agua llegue de la canilla al desagüe.
 * El agua avanza en vivo por los caños conectados. Cada cañería resuelta da tiempo extra y la siguiente es más grande.
 */
export class Plomeria extends Phaser.Scene {
  private puntos = 0;
  private nivel = 0;
  private reloj = 0;
  private fin = 0;
  private desde = 0;
  private terminado = false;
  private resuelto = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private t!: Canerias;
  private capa!: Phaser.GameObjects.Container;
  private tiles: Phaser.GameObjects.Container[] = [];
  private tam = 36;
  private x0 = 0;
  private y0 = 0;

  constructor() {
    super('Plomeria');
  }

  create(): void {
    this.puntos = 0;
    this.nivel = 0;
    this.reloj = 0;
    this.terminado = false;
    this.fin = DURACION / Math.sqrt(ritmo()) + 1500;
    this.marcador = montarMinijuego(this, 'Changa de plomería', 0.65);
    this.combo = new Combo(this);
    this.capa = this.add.container(0, 0);
    aviso(this, 'Toca los caños para girarlos.\nLleva el agua de la canilla al desagüe.', 2000);
    this.time.delayedCall(1500, () => this.nuevoNivel());
  }

  private nuevoNivel(): void {
    if (this.terminado) return;
    this.t = nivelCanerias(this.nivel);
    this.resuelto = false;
    this.desde = this.reloj;
    this.tam = Math.min(40, Math.floor(360 / this.t.cols), Math.floor(190 / this.t.filas));
    this.x0 = 240 - (this.t.cols * this.tam) / 2;
    this.y0 = 60 + (196 - this.t.filas * this.tam) / 2;
    this.capa.removeAll(true);
    this.tiles = [];
    // Canilla a la izquierda y desagüe a la derecha.
    const g = this.add.graphics();
    const yIn = this.y0 + (this.t.entrada + 0.5) * this.tam;
    const yOut = this.y0 + (this.t.salida + 0.5) * this.tam;
    g.fillStyle(0x9aa3ad, 1).fillRect((this.x0 - 24) * E, (yIn - 6) * E, 24 * E, 12 * E);
    g.fillStyle(0xc7cfd8, 1).fillRect((this.x0 - 34) * E, (yIn - 12) * E, 12 * E, 24 * E);
    g.fillStyle(0x4fa8ff, 1).fillCircle((this.x0 - 28) * E, (yIn - 18) * E, 4 * E);
    g.fillStyle(0x9aa3ad, 1).fillRect((this.x0 + this.t.cols * this.tam) * E, (yOut - 6) * E, 22 * E, 12 * E);
    g.fillStyle(0x2a2a30, 1).fillCircle((this.x0 + this.t.cols * this.tam + 28) * E, yOut * E, 9 * E);
    this.capa.add(g);
    this.capa.add(texto(this, this.x0 - 28, yIn + 14, 'Canilla', { tam: 8, color: '#c9b9a6' }).setOrigin(0.5, 0));
    this.capa.add(texto(this, this.x0 + this.t.cols * this.tam + 28, yOut + 12, 'Desagüe', { tam: 8, color: '#c9b9a6' }).setOrigin(0.5, 0));

    for (let i = 0; i < this.t.celdas.length; i++) {
      const cx = this.x0 + ((i % this.t.cols) + 0.5) * this.tam;
      const cy = this.y0 + (Math.floor(i / this.t.cols) + 0.5) * this.tam;
      const c = this.add.container(cx * E, cy * E);
      const zona = this.add.zone(0, 0, this.tam * E, this.tam * E).setInteractive({ useHandCursor: true });
      zona.on('pointerdown', () => this.tocar(i));
      c.add(zona);
      this.tiles.push(c);
      this.capa.add(c);
    }
    this.dibujar();
    this.capa.setAlpha(0);
    this.tweens.add({ targets: this.capa, alpha: 1, duration: 200 });
  }

  /** Dibuja cada caño: gris si está seco, azul si le llega agua. */
  private dibujar(): void {
    const { mojadas } = aguaLlega(this.t);
    const T = this.tam;
    const a = T * 0.3;
    this.t.celdas.forEach((ab, i) => {
      const c = this.tiles[i];
      const viejo = c.getByName('caño') as Phaser.GameObjects.Graphics | null;
      viejo?.destroy();
      const g = this.add.graphics().setName('caño');
      g.fillStyle(0x2a2030, 1).fillRoundedRect((-T / 2 + 1) * E, (-T / 2 + 1) * E, (T - 2) * E, (T - 2) * E, 3 * E);
      const mojado = mojadas.has(i);
      const color = mojado ? 0x4fa8ff : 0x8a929c;
      const brazo = (dx: number, dy: number) => {
        const x = dx === 0 ? -a / 2 : dx > 0 ? 0 : -T / 2;
        const y = dy === 0 ? -a / 2 : dy > 0 ? 0 : -T / 2;
        const w = dx === 0 ? a : T / 2;
        const h = dy === 0 ? a : T / 2;
        g.fillStyle(0x1b1424, 1).fillRect((x - 1) * E, (y - 1) * E, (w + 2) * E, (h + 2) * E);
        g.fillStyle(color, 1).fillRect(x * E, y * E, w * E, h * E);
      };
      if (ab & N) brazo(0, -1);
      if (ab & ES) brazo(1, 0);
      if (ab & S) brazo(0, 1);
      if (ab & O) brazo(-1, 0);
      g.fillStyle(color, 1).fillCircle(0, 0, (a * 0.62) * E);
      if (mojado) g.fillStyle(0xffffff, 0.35).fillCircle(-a * 0.15 * E, -a * 0.15 * E, a * 0.2 * E);
      c.addAt(g, 0);
    });
  }

  private tocar(i: number): void {
    if (this.terminado || this.resuelto) return;
    this.t.celdas[i] = girar(this.t.celdas[i]);
    const c = this.tiles[i];
    c.setAngle(-90);
    this.tweens.add({ targets: c, angle: 0, duration: 110, ease: 'Quad.easeOut' });
    this.dibujar();
    if (aguaLlega(this.t).llega) this.resolver();
  }

  private resolver(): void {
    this.resuelto = true;
    const seg = (this.reloj - this.desde) / 1000;
    const p = this.combo.acierto(puntosCanerias(this.nivel, seg));
    this.puntos += p;
    this.marcador.puntos(this.puntos);
    this.fin += PREMIO_TIEMPO;
    flotar(this, `+${p} ¡Corre el agua! +6 s`, 240, 52, true);
    this.cameras.main.flash(150, 120, 190, 255, false);
    this.tweens.add({ targets: this.tiles, scale: 1.08, duration: 120, yoyo: true });
    this.nivel += 1;
    this.time.delayedCall(900, () => this.nuevoNivel());
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(resta / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Arreglaste ${this.nivel} cañerías`);
    }
  }
}

