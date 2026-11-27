import Phaser from 'phaser';
import {
  PRODUCTOS_ALMACEN,
  type Tablero,
  aVaciar,
  caer,
  hayMovimiento,
  intercambiar,
  lineas,
  movidaValida,
  puntosTres,
  tableroNuevo,
  vecinas,
} from '../core/rompecabezas';
import { juego } from '../juego';
import { COLOR, E, caja } from '../ui/ui';
import { estallido, onda } from '../ui/efectos';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 60_000;
const COLS = 8;
const FILAS = 6;
const T = 31;
/** Color de fondo de cada producto (mismo orden que PRODUCTOS_ALMACEN). */
const COLORES_PRODUCTO = [0xffd25a, 0xff7a3d, 0x4fa8ff, 0xe0403a, 0x7fd16b, 0xc77dff];
const X0 = 240 - (COLS * T) / 2;
const Y0 = 62;

/**
 * Reponer el almacén (R026), tres en línea: intercambiar dos productos vecinos (deslizando o tocando uno y otro)
 * para formar líneas de 3 o más. Línea de 4: vacía la fila o columna. Línea de 5: vacía todo ese producto.
 * Las cascadas valen cada vez más.
 */
export class Almacen extends Phaser.Scene {
  private puntos = 0;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private ocupado = false;
  private marcador!: Marcador;
  private t!: Tablero;
  private tipos = 5;
  private piezas: (Phaser.GameObjects.Container | null)[] = [];
  private elegida = -1;
  private marco!: Phaser.GameObjects.Graphics;
  private inicioToque: { i: number; x: number; y: number } | null = null;
  private mejorCascada = 0;

  constructor() {
    super('Almacen');
  }

  create(): void {
    this.puntos = 0;
    this.reloj = 0;
    this.terminado = false;
    this.ocupado = false;
    this.elegida = -1;
    this.mejorCascada = 0;
    this.fin = DURACION + 1500;
    // Más tipos de producto en etapas altas: cuesta más armar líneas.
    this.tipos = juego.e.etapa >= 5 ? 6 : 5;
    this.marcador = montarMinijuego(this, 'Reponer el almacén', 0.6);
    const g = this.add.graphics();
    caja(g, X0 - 6, Y0 - 6, COLS * T + 12, FILAS * T + 12, 0x3a2b22, COLOR.borde);
    for (let y = 0; y < FILAS; y++) for (let x = 0; x < COLS; x++) {
      g.fillStyle((x + y) % 2 ? 0x4a372b : 0x423126, 1).fillRect((X0 + x * T) * E, (Y0 + y * T) * E, T * E, T * E);
    }
    this.marco = this.add.graphics().setDepth(10);
    this.t = tableroNuevo(COLS, FILAS, this.tipos);
    this.piezas = this.t.celdas.map((v, i) => this.crearPieza(v, i));

    const zona = this.add.zone(X0 * E, Y0 * E, COLS * T * E, FILAS * T * E).setOrigin(0).setInteractive();
    zona.on('pointerdown', (p: Phaser.Input.Pointer) => this.tocar(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.soltar(p));
    aviso(this, 'Desliza un producto hacia su vecino para cambiarlos.\n3 iguales en línea se reponen. ¡4 y 5 valen mucho más!', 2400);
  }

  private pos(i: number): { x: number; y: number } {
    return { x: (X0 + ((i % COLS) + 0.5) * T) * E, y: (Y0 + (Math.floor(i / COLS) + 0.5) * T) * E };
  }

  /** Producto con un círculo de su color detrás, para distinguirlos de un vistazo. */
  private crearPieza(v: number, i: number, desdeFila?: number): Phaser.GameObjects.Container {
    const p = this.pos(i);
    const c = this.add.container(p.x, p.y).setDepth(5);
    c.add(this.add.circle(0, 0, T * 0.44 * E, COLORES_PRODUCTO[v], 0.55));
    const img = this.add.image(0, 0, PRODUCTOS_ALMACEN[v]);
    img.setScale((T * 0.74 * E) / Math.max(img.width, img.height));
    c.add(img);
    if (desdeFila !== undefined) {
      // Los nuevos bajan desde arriba del tablero y aparecen al entrar.
      c.y = (Y0 + (desdeFila + 0.5) * T) * E;
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 220, ease: 'Quad.easeIn' });
    }
    return c;
  }

  private casilla(p: Phaser.Input.Pointer): number {
    const x = Math.floor((p.x / E - X0) / T);
    const y = Math.floor((p.y / E - Y0) / T);
    if (x < 0 || y < 0 || x >= COLS || y >= FILAS) return -1;
    return y * COLS + x;
  }

  private tocar(p: Phaser.Input.Pointer): void {
    if (this.terminado || this.ocupado) return;
    const i = this.casilla(p);
    if (i < 0) return;
    // Tocar uno y después un vecino también vale.
    if (this.elegida >= 0 && this.elegida !== i && vecinas(COLS, this.elegida, i)) {
      const a = this.elegida;
      this.elegir(-1);
      void this.jugar(a, i);
      return;
    }
    this.inicioToque = { i, x: p.x, y: p.y };
    this.elegir(i);
  }

  private soltar(p: Phaser.Input.Pointer): void {
    const ini = this.inicioToque;
    this.inicioToque = null;
    if (!ini || this.terminado || this.ocupado) return;
    const dx = p.x - ini.x;
    const dy = p.y - ini.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < (T / 3) * E) return; // fue un toque, no un deslizamiento
    const x = ini.i % COLS;
    const y = Math.floor(ini.i / COLS);
    const nx = Math.abs(dx) > Math.abs(dy) ? x + Math.sign(dx) : x;
    const ny = Math.abs(dx) > Math.abs(dy) ? y : y + Math.sign(dy);
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= FILAS) return;
    this.elegir(-1);
    void this.jugar(ini.i, ny * COLS + nx);
  }

  private elegir(i: number): void {
    this.elegida = i;
    this.marco.clear();
    if (i < 0) return;
    const p = this.pos(i);
    this.marco.lineStyle(1.5 * E, 0xffd25a, 1).strokeRoundedRect(p.x - (T / 2) * E, p.y - (T / 2) * E, T * E, T * E, 4 * E);
    this.marco.setAlpha(1);
    this.tweens.killTweensOf(this.marco);
    this.tweens.add({ targets: this.marco, alpha: 0.45, duration: 380, yoyo: true, repeat: -1 });
    const pieza = this.piezas[i];
    if (pieza) this.tweens.add({ targets: pieza, scale: 1.12, duration: 110, yoyo: true });
  }

  private mover(objs: Phaser.GameObjects.Container[], a: number[], ms: number): Promise<void> {
    return new Promise((res) => {
      objs.forEach((o, k) => {
        const p = this.pos(a[k]);
        this.tweens.add({ targets: o, x: p.x, y: p.y, duration: ms, ease: ms > 150 ? 'Back.easeOut' : 'Quad.easeOut', onComplete: k === 0 ? () => res() : undefined });
      });
      if (!objs.length) res();
    });
  }

  private espera(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  private async jugar(a: number, b: number): Promise<void> {
    if (this.ocupado || this.terminado) return;
    this.ocupado = true;
    const ia = this.piezas[a]!;
    const ib = this.piezas[b]!;
    const valida = movidaValida(this.t, a, b);
    await this.mover([ia, ib], [b, a], 130);
    if (!valida) {
      // No arma nada: vuelven a su lugar.
      await this.mover([ia, ib], [a, b], 130);
      // Jugada que no arma nada: los dos productos se sacuden.
      for (const o of [ia, ib]) this.tweens.add({ targets: o, angle: { from: -12, to: 12 }, duration: 50, yoyo: true, repeat: 2, onComplete: () => o.setAngle(0) });
      this.ocupado = false;
      return;
    }
    intercambiar(this.t, a, b);
    [this.piezas[a], this.piezas[b]] = [ib, ia];
    let cascada = 0;
    for (;;) {
      const ls = lineas(this.t);
      if (!ls.length || this.terminado) break;
      const fuera = aVaciar(this.t, ls);
      const largo = Math.max(...ls.map((l) => l.largo));
      const pts = puntosTres(fuera.size, cascada);
      this.puntos += pts;
      this.marcador.puntos(this.puntos);
      const centro = this.pos([...fuera][0]);
      const extra = largo >= 5 ? ' ¡Todo el estante!' : largo === 4 ? ' ¡Fila completa!' : '';
      flotar(this, `+${pts}${cascada > 0 ? ` Cascada ×${cascada + 1}` : ''}${extra}`, centro.x / E, centro.y / E - 10, true);
      if (largo >= 4) this.cameras.main.shake(140, 0.006);
      this.mejorCascada = Math.max(this.mejorCascada, cascada + 1);
      if (largo >= 4) onda(this, centro.x, centro.y, 0xffd25a, largo >= 5 ? 140 : 90, 520, 4);
      for (const i of fuera) {
        const o = this.piezas[i];
        const tipo = this.t.celdas[i];
        // Cada producto que se va estalla en su color (R028).
        if (o) {
          estallido(this, o.x, o.y, { textura: 'fx_px', colores: [COLORES_PRODUCTO[tipo] ?? 0xffffff, 0xffffff], cantidad: 6, velocidad: [30, 90], vida: 380 });
          this.tweens.add({ targets: o, scale: 1.25, duration: 70, yoyo: true, onComplete: () => this.tweens.add({ targets: o, scale: 0, angle: 90, duration: 120, onComplete: () => o.destroy() }) });
        }
        this.piezas[i] = null;
        this.t.celdas[i] = -1;
      }
      await this.espera(220);
      // Caen los que quedan y llegan productos nuevos desde arriba.
      const viejas = [...this.piezas];
      const desde = caer(this.t, this.tipos);
      const nuevas: (Phaser.GameObjects.Container | null)[] = new Array(this.t.celdas.length).fill(null);
      const mover: Phaser.GameObjects.Container[] = [];
      const destinos: number[] = [];
      for (let i = 0; i < this.t.celdas.length; i++) {
        const x = i % COLS;
        const d = desde[i];
        const img = d >= 0 ? viejas[d * COLS + x]! : this.crearPieza(this.t.celdas[i], i, d);
        nuevas[i] = img;
        mover.push(img);
        destinos.push(i);
      }
      this.piezas = nuevas;
      await this.mover(mover, destinos, 260);
      cascada += 1;
    }
    if (!hayMovimiento(this.t) && !this.terminado) {
      flotar(this, 'Sin jugadas: ¡a reordenar!', 240, 150, true);
      await this.espera(500);
      this.piezas.forEach((o) => o?.destroy());
      this.t = tableroNuevo(COLS, FILAS, this.tipos);
      this.piezas = this.t.celdas.map((v, i) => this.crearPieza(v, i));
    }
    this.ocupado = false;
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0 && !this.ocupado) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, this.mejorCascada ? `Mejor cascada: ×${this.mejorCascada}` : 'No armaste ninguna línea');
    }
  }
}

