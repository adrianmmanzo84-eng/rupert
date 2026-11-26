import Phaser from 'phaser';
import { type Cables, cableCompleto, nivelCables, puntosCables, vecinas } from '../core/rompecabezas';
import { E, texto } from '../ui/ui';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, ritmo, terminarMinijuego } from './comun';

const DURACION = 60_000;
const PREMIO_TIEMPO = 6_000;
const COLORES = [0xff5a4f, 0x4fa8ff, 0x7fd16b, 0xffd25a, 0xc77dff, 0xffa04f];

/**
 * Changa de electricidad (R026): arrastrar el dedo desde cada enchufe hasta el foco de su color.
 * Los cables no se pueden cruzar. Al unir todos, se encienden los focos y viene un tablero más grande.
 */
export class Electricidad extends Phaser.Scene {
  private puntos = 0;
  private nivel = 0;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private resuelto = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private c!: Cables;
  private caminos: number[][] = [];
  private activo = -1;
  private capa!: Phaser.GameObjects.Container;
  private lineas!: Phaser.GameObjects.Graphics;
  private puntas!: Phaser.GameObjects.Graphics;
  private tam = 36;
  private x0 = 0;
  private y0 = 0;

  constructor() {
    super('Electricidad');
  }

  create(): void {
    this.puntos = 0;
    this.nivel = 0;
    this.reloj = 0;
    this.terminado = false;
    this.fin = DURACION / Math.sqrt(ritmo()) + 1500;
    this.marcador = montarMinijuego(this, 'Changa de electricidad', 0.65);
    this.combo = new Combo(this);
    this.capa = this.add.container(0, 0);
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.arrastrar(p));
    this.input.on('pointerup', () => this.soltar());
    aviso(this, 'Arrastra desde cada enchufe hasta su foco.\nLos cables no se pueden cruzar.', 2000);
    this.time.delayedCall(1500, () => this.nuevoNivel());
  }

  private nuevoNivel(): void {
    if (this.terminado) return;
    this.c = nivelCables(this.nivel);
    this.caminos = this.c.pares.map(() => []);
    this.activo = -1;
    this.resuelto = false;
    this.tam = Math.min(34, Math.floor(300 / this.c.cols), Math.floor(196 / this.c.filas));
    this.x0 = 240 - (this.c.cols * this.tam) / 2;
    this.y0 = 60 + (196 - this.c.filas * this.tam) / 2;
    this.capa.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(0x1b1424, 0.92).fillRoundedRect((this.x0 - 6) * E, (this.y0 - 6) * E, (this.c.cols * this.tam + 12) * E, (this.c.filas * this.tam + 12) * E, 5 * E);
    g.lineStyle(E, 0x3a3048, 1);
    for (let x = 0; x <= this.c.cols; x++) g.lineBetween((this.x0 + x * this.tam) * E, this.y0 * E, (this.x0 + x * this.tam) * E, (this.y0 + this.c.filas * this.tam) * E);
    for (let y = 0; y <= this.c.filas; y++) g.lineBetween(this.x0 * E, (this.y0 + y * this.tam) * E, (this.x0 + this.c.cols * this.tam) * E, (this.y0 + y * this.tam) * E);
    this.capa.add(g);
    this.lineas = this.add.graphics();
    this.puntas = this.add.graphics();
    this.capa.add([this.lineas, this.puntas]);
    const zona = this.add.zone(this.x0 * E, this.y0 * E, this.c.cols * this.tam * E, this.c.filas * this.tam * E).setOrigin(0).setInteractive();
    zona.on('pointerdown', (p: Phaser.Input.Pointer) => this.empezar(p));
    this.capa.add(zona);
    this.capa.add(texto(this, 240, this.y0 + this.c.filas * this.tam + 8, `Tablero ${this.nivel + 1}`, { tam: 9, color: '#c9b9a6' }).setOrigin(0.5, 0));
    this.dibujar();
  }

  private casilla(p: Phaser.Input.Pointer): number {
    const x = Math.floor((p.x / E - this.x0) / this.tam);
    const y = Math.floor((p.y / E - this.y0) / this.tam);
    if (x < 0 || y < 0 || x >= this.c.cols || y >= this.c.filas) return -1;
    return y * this.c.cols + x;
  }

  private centro(i: number): { x: number; y: number } {
    return { x: (this.x0 + ((i % this.c.cols) + 0.5) * this.tam) * E, y: (this.y0 + (Math.floor(i / this.c.cols) + 0.5) * this.tam) * E };
  }

  /** ¿De qué color es esta casilla (punta o cable)? −1 si está libre. */
  private duenoDe(i: number): number {
    const punta = this.c.pares.findIndex((p) => p.a === i || p.b === i);
    if (punta >= 0) return punta;
    return this.caminos.findIndex((cam) => cam.includes(i));
  }

  private empezar(p: Phaser.Input.Pointer): void {
    if (this.terminado || this.resuelto) return;
    const i = this.casilla(p);
    if (i < 0) return;
    const k = this.duenoDe(i);
    if (k < 0) return;
    const par = this.c.pares[k];
    if (i === par.a || i === par.b) this.caminos[k] = [i];
    else this.caminos[k] = this.caminos[k].slice(0, this.caminos[k].indexOf(i) + 1);
    this.activo = k;
    this.dibujar();
  }

  private arrastrar(p: Phaser.Input.Pointer): void {
    if (this.activo < 0 || this.resuelto) return;
    const i = this.casilla(p);
    const cam = this.caminos[this.activo];
    const ultimo = cam[cam.length - 1];
    if (i < 0 || i === ultimo || !vecinas(this.c.cols, ultimo, i)) return;
    // Volver para atrás borra el último tramo.
    if (cam.length >= 2 && cam[cam.length - 2] === i) {
      cam.pop();
      this.dibujar();
      return;
    }
    if (cableCompleto(this.c, this.activo, cam)) return;
    const dueno = this.duenoDe(i);
    const par = this.c.pares[this.activo];
    const esMiPunta = i === par.a || i === par.b;
    if (dueno !== -1 && !(dueno === this.activo && esMiPunta)) return;
    if (cam.includes(i)) return;
    cam.push(i);
    this.dibujar();
    if (cableCompleto(this.c, this.activo, cam)) {
      this.cameras.main.shake(60, 0.002);
      this.revisar();
    }
  }

  private soltar(): void {
    this.activo = -1;
  }

  private dibujar(): void {
    const T = this.tam;
    this.lineas.clear();
    this.puntas.clear();
    this.caminos.forEach((cam, k) => {
      if (cam.length < 2) return;
      const listo = cableCompleto(this.c, k, cam);
      this.lineas.lineStyle(T * 0.34 * E, COLORES[k], listo ? 1 : 0.75);
      this.lineas.beginPath();
      const p0 = this.centro(cam[0]);
      this.lineas.moveTo(p0.x, p0.y);
      for (const i of cam.slice(1)) {
        const q = this.centro(i);
        this.lineas.lineTo(q.x, q.y);
      }
      this.lineas.strokePath();
      for (const i of cam) {
        const q = this.centro(i);
        this.lineas.fillStyle(COLORES[k], listo ? 1 : 0.75).fillCircle(q.x, q.y, T * 0.17 * E);
      }
    });
    this.c.pares.forEach((par, k) => {
      const listo = cableCompleto(this.c, k, this.caminos[k]);
      // Enchufe: cuadrado con dos patitas.
      const a = this.centro(par.a);
      this.puntas.fillStyle(0x1b1424, 1).fillRoundedRect(a.x - T * 0.36 * E, a.y - T * 0.36 * E, T * 0.72 * E, T * 0.72 * E, 3 * E);
      this.puntas.fillStyle(COLORES[k], 1).fillRoundedRect(a.x - T * 0.3 * E, a.y - T * 0.3 * E, T * 0.6 * E, T * 0.6 * E, 3 * E);
      this.puntas.fillStyle(0x1b1424, 1).fillRect(a.x - T * 0.14 * E, a.y - T * 0.12 * E, T * 0.07 * E, T * 0.24 * E);
      this.puntas.fillRect(a.x + T * 0.07 * E, a.y - T * 0.12 * E, T * 0.07 * E, T * 0.24 * E);
      // Foco: apagado (gris con borde del color) o encendido (amarillo con resplandor).
      const b = this.centro(par.b);
      if (listo) this.puntas.fillStyle(0xfff2a8, 0.35).fillCircle(b.x, b.y, T * 0.62 * E);
      this.puntas.fillStyle(0x1b1424, 1).fillCircle(b.x, b.y, T * 0.36 * E);
      this.puntas.fillStyle(COLORES[k], 1).fillCircle(b.x, b.y, T * 0.32 * E);
      this.puntas.fillStyle(listo ? 0xfff2a8 : 0x4a4152, 1).fillCircle(b.x, b.y, T * 0.22 * E);
    });
  }

  private revisar(): void {
    if (!this.c.pares.every((_, k) => cableCompleto(this.c, k, this.caminos[k]))) return;
    this.resuelto = true;
    this.activo = -1;
    const p = this.combo.acierto(puntosCables(this.nivel));
    this.puntos += p;
    this.marcador.puntos(this.puntos);
    this.fin += PREMIO_TIEMPO;
    flotar(this, `+${p} ¡Hay luz! +6 s`, 240, 52, true);
    this.cameras.main.flash(180, 255, 240, 160, false);
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
      terminarMinijuego(this, this.puntos, `Conectaste ${this.nivel} tableros`);
    }
  }
}
