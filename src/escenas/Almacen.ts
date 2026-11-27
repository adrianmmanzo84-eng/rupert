import Phaser from 'phaser';
import { sonar } from '../audio/sonido';
import {
  ESP,
  PRODUCTOS_ALMACEN,
  type Paso,
  type Tablero,
  aplicarPaso,
  buscarMovimiento,
  caer,
  especiales,
  hayMovimiento,
  intercambiar,
  movidaValida,
  paso,
  puntosTres,
  tableroNuevo,
  vecinas,
} from '../core/rompecabezas';
import { juego } from '../juego';
import { COLOR, E, caja, texto } from '../ui/ui';
import { estallido, monedasHacia, onda, rebote } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 60_000;
/** Tiempo que se puede ganar jugando bien, como máximo, en total. */
const EXTRA_MAX = 30_000;
const COLS = 8;
const FILAS = 6;
const T = 31;
/** Color de fondo de cada producto (mismo orden que PRODUCTOS_ALMACEN). */
const COLORES_PRODUCTO = [0xffd25a, 0xff7a3d, 0x4fa8ff, 0xe0403a, 0x7fd16b, 0xc77dff];
const X0 = 240 - (COLS * T) / 2;
const Y0 = 62;
/** Cartel de cada nivel de cascada. */
const CARTELES = ['', '', '¡Cascada!', '¡Doble cascada!', '¡Triple cascada!', '¡Avalancha!', '¡Terremoto de ofertas!'];
const NOMBRE_ESP: Record<number, string> = {
  [ESP.fila]: '¡Oferta relámpago!', [ESP.columna]: '¡Oferta relámpago!', [ESP.bomba]: '¡Precio bomba!', [ESP.estrella]: '¡Liquidación total!',
};

/**
 * Reponer el almacén (R026, R035), tres en línea: intercambiar dos productos vecinos (deslizando o tocando uno y otro)
 * para formar líneas de 3 o más.
 * - Línea de 4: nace una oferta relámpago, que vacía su fila o columna al armar una línea con ella o moverla.
 * - Línea de 5: nace una liquidación total; al moverla junto a un producto, vacía todos los de ese tipo.
 * - Dos líneas cruzadas (L, T o +): nace un precio bomba, que vacía 3 × 3.
 * Las cascadas valen cada vez más, las jugadas seguidas dan combo y las buenas jugadas regalan segundos.
 */
export class Almacen extends Phaser.Scene {
  private puntos = 0;
  private reloj = 0;
  private fin = 0;
  private extra = 0;
  private terminado = false;
  private ocupado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private t!: Tablero;
  private tipos = 5;
  private piezas: (Phaser.GameObjects.Container | null)[] = [];
  private elegida = -1;
  private marco!: Phaser.GameObjects.Graphics;
  private inicioToque: { i: number; x: number; y: number } | null = null;
  private mejorCascada = 0;
  private ultimaAccion = 0;

  constructor() {
    super('Almacen');
  }

  create(): void {
    this.puntos = 0;
    this.reloj = 0;
    this.terminado = false;
    this.ocupado = true;
    this.elegida = -1;
    this.mejorCascada = 0;
    this.extra = 0;
    this.ultimaAccion = 0;
    this.fin = DURACION + 1500;
    // Más tipos de producto en etapas altas: cuesta más armar líneas.
    this.tipos = juego.e.etapa >= 5 ? 6 : 5;
    this.marcador = montarMinijuego(this, 'Reponer el almacén', 0.6);
    this.combo = new Combo(this);
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
    aviso(this, 'Desliza un producto para cambiarlo con su vecino.\n¡Con 4, con 5 o con una cruz nacen productos especiales!', 2400);
    this.entrada();
  }

  /** Al empezar, los productos caen al estante uno tras otro, con rebote. */
  private entrada(): void {
    this.piezas.forEach((o, i) => {
      if (!o) return;
      const p = this.pos(i);
      o.y = p.y - (FILAS * T + 40) * E;
      this.tweens.add({ targets: o, y: p.y, duration: 520, delay: 250 + Math.floor(i / COLS) * 70 + (i % COLS) * 30, ease: 'Bounce.easeOut' });
    });
    this.time.delayedCall(250 + 5 * 70 + 7 * 30 + 560, () => {
      this.ocupado = false;
      this.ultimaAccion = this.reloj;
    });
  }

  private pos(i: number): { x: number; y: number } {
    return { x: (X0 + ((i % COLS) + 0.5) * T) * E, y: (Y0 + (Math.floor(i / COLS) + 0.5) * T) * E };
  }

  /** Producto con un círculo de su color detrás, para distinguirlos de un vistazo; respira con calma. */
  private crearPieza(v: number, i: number, desdeFila?: number, esp = 0): Phaser.GameObjects.Container {
    const p = this.pos(i);
    const c = this.add.container(p.x, p.y).setDepth(5);
    c.setData('tipo', v);
    c.add(this.add.circle(0, 0, T * 0.44 * E, COLORES_PRODUCTO[v], 0.55));
    const img = this.add.image(0, 0, PRODUCTOS_ALMACEN[v]);
    const base = (T * 0.74 * E) / Math.max(img.width, img.height);
    img.setScale(base);
    c.add(img);
    // Cada producto respira a su ritmo, así el estante nunca está quieto.
    this.tweens.add({
      targets: img, scaleX: base * 1.05, scaleY: base * 0.95, duration: Phaser.Math.Between(650, 1000), yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 700),
    });
    if (esp) this.decorar(c, esp);
    if (desdeFila !== undefined) {
      // Los nuevos bajan desde arriba del tablero y aparecen al entrar.
      c.y = (Y0 + (desdeFila + 0.5) * T) * E;
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 220, ease: 'Quad.easeIn' });
    }
    return c;
  }

  /** Marca de especial: aro y flechas (oferta relámpago), chispas (bomba) o estrella giratoria (liquidación). */
  private decorar(c: Phaser.GameObjects.Container, esp: number): void {
    const viejo = c.getData('deco') as Phaser.GameObjects.Graphics | undefined;
    if (viejo) {
      this.tweens.killTweensOf(viejo);
      viejo.destroy();
    }
    c.setData('esp', esp);
    if (!esp) return;
    const r = (T / 2) * E;
    const g = this.add.graphics();
    const color = esp === ESP.estrella ? 0xffffff : esp === ESP.bomba ? 0xff7a3d : 0xffe27a;
    g.lineStyle(2 * E, color, 1).strokeCircle(0, 0, r * 0.92);
    g.fillStyle(color, 1);
    if (esp === ESP.fila || esp === ESP.columna) {
      const v = esp === ESP.columna;
      for (const s of [-1, 1]) {
        const a = [s * r * 1.02, 0, s * r * 0.62, -r * 0.3, s * r * 0.62, r * 0.3];
        g.fillTriangle(v ? a[1] : a[0], v ? a[0] : a[1], v ? a[3] : a[2], v ? a[2] : a[3], v ? a[5] : a[4], v ? a[4] : a[5]);
      }
    } else if (esp === ESP.bomba) {
      for (let k = 0; k < 8; k++) {
        const an = (k * Math.PI) / 4;
        g.lineStyle(1.5 * E, color, 1).lineBetween(Math.cos(an) * r * 0.6, Math.sin(an) * r * 0.6, Math.cos(an) * r * 1.0, Math.sin(an) * r * 1.0);
      }
    } else {
      g.lineStyle(1.5 * E, color, 1);
      const pts: Phaser.Math.Vector2[] = [];
      for (let k = 0; k < 10; k++) {
        const an = -Math.PI / 2 + (k * Math.PI) / 5;
        const rr = k % 2 ? r * 0.66 : r * 1.0;
        pts.push(new Phaser.Math.Vector2(Math.cos(an) * rr, Math.sin(an) * rr));
      }
      g.strokePoints(pts, true);
    }
    c.add(g);
    c.setData('deco', g);
    this.tweens.add({ targets: g, alpha: 0.45, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (esp === ESP.estrella) this.tweens.add({ targets: g, angle: 360, duration: 2600, repeat: -1 });
    if (esp === ESP.bomba) this.tweens.add({ targets: g, scale: 1.18, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private quitar(o: Phaser.GameObjects.Container | null | undefined): void {
    if (!o) return;
    this.tweens.killTweensOf([o, ...o.list]);
    o.destroy();
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
    this.ultimaAccion = this.reloj;
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

  private mover(objs: Phaser.GameObjects.Container[], a: number[], ms: number, ease?: string): Promise<void> {
    return new Promise((res) => {
      objs.forEach((o, k) => {
        const p = this.pos(a[k]);
        this.tweens.add({ targets: o, x: p.x, y: p.y, duration: ms, ease: ease ?? (ms > 150 ? 'Back.easeOut' : 'Quad.easeOut'), onComplete: k === 0 ? () => res() : undefined });
      });
      if (!objs.length) res();
    });
  }

  private espera(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, res));
  }

  /** Los dos productos se cruzan: uno pasa por encima del otro, agrandado. */
  private cruzar(ia: Phaser.GameObjects.Container, ib: Phaser.GameObjects.Container, a: number, b: number, ms: number): Promise<void> {
    ia.setDepth(7);
    this.tweens.add({ targets: ia, scale: 1.18, duration: ms / 2, yoyo: true });
    this.tweens.add({ targets: ib, scale: 0.88, duration: ms / 2, yoyo: true });
    return this.mover([ia, ib], [b, a], ms, 'Sine.easeInOut').then(() => {
      ia.setDepth(5);
    });
  }

  /** Suma segundos por jugar bien (hasta un tope) y los muestra junto al reloj. */
  private ganarTiempo(s: number): void {
    const ms = Math.min(s * 1000, EXTRA_MAX - this.extra);
    if (ms <= 0) return;
    this.extra += ms;
    this.fin += ms;
    const t = texto(this, 92, 22, `+${Math.round(ms / 1000)} s`, { tam: 12, color: '#9fe8ff' }).setOrigin(0, 0.5).setDepth(52).setScale(0.5);
    this.tweens.add({ targets: t, scale: 1.2, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 8 * E, delay: 600, duration: 350, onComplete: () => t.destroy() });
  }

  /** Cartel grande en el centro del estante: crece y se desvanece. */
  private cartel(s: string, color: string, tam = 16): void {
    const t = texto(this, 240, Y0 + (FILAS * T) / 2 - 10, s, { tam, color }).setOrigin(0.5).setDepth(58).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, scale: 1.25, y: t.y - 14 * E, delay: 520, duration: 360, onComplete: () => t.destroy() });
  }

  /** Destello de color sobre todo el estante. */
  private destello(color: number, alfa = 0.35, ms = 260): void {
    const r = this.add.rectangle((X0 - 6) * E, (Y0 - 6) * E, (COLS * T + 12) * E, (FILAS * T + 12) * E, color, alfa).setOrigin(0).setDepth(30);
    r.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
  }

  /** Golpecito de cámara que se aleja: da sensación de golpe. */
  private golpe(zoom = 1.035): void {
    const c = this.cameras.main;
    c.zoomTo(zoom, 70, 'Quad.easeOut', true, (_cam, p) => {
      if (p === 1) c.zoomTo(1, 220, 'Quad.easeIn', true);
    });
  }

  /** Efecto propio de cada especial al explotar. */
  private explotar(a: Paso['activadas'][number], fuera: Set<number>): void {
    const p = this.pos(a.i);
    const dibujo = (): Phaser.GameObjects.Graphics => this.add.graphics().setDepth(53);
    if (a.esp === ESP.fila || a.esp === ESP.columna) {
      // Rayo de luz que barre toda la fila o columna.
      const h = a.esp === ESP.fila;
      const largo = (h ? COLS : FILAS) * T * E;
      const r = this.add.rectangle(h ? (X0 + (COLS * T) / 2) * E : p.x, h ? p.y : (Y0 + (FILAS * T) / 2) * E, h ? largo : T * E * 0.9, h ? T * E * 0.9 : largo, 0xfff2a8, 0.9)
        .setDepth(53).setBlendMode(Phaser.BlendModes.ADD);
      if (h) r.scaleY = 0.15; else r.scaleX = 0.15;
      this.tweens.add({ targets: r, scaleY: h ? 1 : 1, scaleX: h ? 1 : 1, duration: 120, onComplete: () => this.tweens.add({ targets: r, alpha: 0, duration: 260, onComplete: () => r.destroy() }) });
      const n = h ? COLS : FILAS;
      for (let k = 0; k < n; k++) {
        const q = h ? this.pos(Math.floor(a.i / COLS) * COLS + k) : this.pos(k * COLS + (a.i % COLS));
        this.time.delayedCall(k * 28, () => estallido(this, q.x, q.y, { textura: 'fx_estrella', colores: [0xfff2a8, 0xffffff], cantidad: 5, velocidad: [30, 80], vida: 420 }));
      }
      this.cameras.main.shake(150, 0.005);
    } else if (a.esp === ESP.bomba) {
      onda(this, p.x, p.y, 0xff7a3d, 95, 520, 5);
      onda(this, p.x, p.y, 0xffe27a, 60, 380, 3);
      estallido(this, p.x, p.y, { textura: 'fx_px', colores: [0xff7a3d, 0xffd25a, 0xffffff, 0x5a5066], cantidad: 30, velocidad: [60, 180], vida: 600, gravedad: 160, escala: 1.3 });
      this.destello(0xff7a3d, 0.3, 300);
      this.cameras.main.shake(260, 0.009);
    } else if (a.esp === ESP.estrella) {
      // Rayos desde la estrella hacia cada producto de ese tipo.
      for (const i of fuera) {
        if (i === a.i || this.t.celdas[i] !== a.tipo) continue;
        const q = this.pos(i);
        const rayo = dibujo();
        rayo.lineStyle(2 * E, 0xffffff, 1);
        const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(p.x, p.y)];
        for (let k = 1; k < 4; k++) {
          pts.push(new Phaser.Math.Vector2(p.x + ((q.x - p.x) * k) / 4 + Phaser.Math.Between(-5, 5) * E, p.y + ((q.y - p.y) * k) / 4 + Phaser.Math.Between(-5, 5) * E));
        }
        pts.push(new Phaser.Math.Vector2(q.x, q.y));
        rayo.strokePoints(pts);
        this.tweens.add({ targets: rayo, alpha: 0, duration: 340, onComplete: () => rayo.destroy() });
      }
      onda(this, p.x, p.y, 0xffffff, 110, 600, 4);
      this.destello(COLORES_PRODUCTO[a.tipo] ?? 0xffffff, 0.45, 420);
      this.cameras.main.shake(300, 0.008);
    }
  }

  private async jugar(a: number, b: number): Promise<void> {
    if (this.ocupado || this.terminado) return;
    this.ocupado = true;
    this.ultimaAccion = this.reloj;
    this.tweens.killTweensOf(this.marco);
    const ia = this.piezas[a]!;
    const ib = this.piezas[b]!;
    const valida = movidaValida(this.t, a, b);
    await this.cruzar(ia, ib, a, b, 140);
    if (!valida) {
      // No arma nada: vuelven a su lugar, sacudidos, y se corta el combo.
      await this.cruzar(ib, ia, b, a, 140);
      this.combo.error();
      for (const o of [ia, ib]) this.tweens.add({ targets: o, angle: { from: -12, to: 12 }, duration: 50, yoyo: true, repeat: 2, onComplete: () => o.setAngle(0) });
      this.ocupado = false;
      return;
    }
    intercambiar(this.t, a, b);
    [this.piezas[a], this.piezas[b]] = [ib, ia];
    const esp = especiales(this.t);
    // Un especial movido a propósito se activa: la estrella toma el producto de su vecino.
    const activar = ([[a, b], [b, a]] as [number, number][]).filter(([x]) => esp[x]).map(([x, y]) => ({ i: x, tipo: this.t.celdas[y] }));
    let cascada = 0;
    let primero = true;
    let jugada = 0;
    for (;;) {
      const p = paso(this.t, primero ? [a, b] : undefined, primero ? activar : []);
      if (!p || this.terminado) break;
      primero = false;
      const pts = puntosTres(p.fuera.size, cascada) + p.activadas.length * 5;
      jugada += pts;
      this.puntos += pts;
      this.marcador.puntos(this.puntos);
      const centro = this.pos([...p.fuera][0]);
      const cuando = (n: number): string => (n > 0 ? ` Cascada ×${n + 1}` : '');
      flotar(this, `+${pts}${cuando(cascada)}`, centro.x / E, centro.y / E - 10, true);
      if (cascada >= 1) {
        const nivel = Math.min(cascada + 1, CARTELES.length - 1);
        this.cartel(CARTELES[nivel], cascada >= 3 ? '#ff9a5a' : COLOR.oro, 14 + Math.min(cascada, 4) * 2);
        this.destello(0xffd25a, 0.12 * Math.min(cascada, 3));
        if (cascada >= 2) this.golpe(1 + 0.012 * Math.min(cascada, 4));
      }
      this.mejorCascada = Math.max(this.mejorCascada, cascada + 1);
      for (const x of p.activadas) this.explotar(x, p.fuera);
      for (const n of p.nuevas) {
        this.cartel(NOMBRE_ESP[n.esp], '#ffe27a', 13);
      }
      // Segundos de regalo por jugar bien.
      let segundos = 0;
      if (p.largo === 4) segundos += 2;
      if (p.largo >= 5) segundos += 3;
      for (const n of p.nuevas) if (n.esp === ESP.bomba) segundos += 2;
      segundos += Math.min(3, p.activadas.length);
      if (cascada >= 1) segundos += 1;
      if (segundos) this.ganarTiempo(segundos);
      // Las monedas vuelan al marcador: una pista visual de que se suma.
      monedasHacia(this, centro.x, centro.y, 70 * E, 14 * E, Math.min(6, 1 + Math.floor(p.fuera.size / 3)));
      for (const i of p.fuera) {
        const o = this.piezas[i];
        const tipo = this.t.celdas[i];
        // Cada producto que se va estalla en su color (R028).
        if (o) {
          estallido(this, o.x, o.y, { textura: 'fx_px', colores: [COLORES_PRODUCTO[tipo] ?? 0xffffff, 0xffffff], cantidad: 6, velocidad: [30, 90], vida: 380 });
          this.tweens.killTweensOf([o, ...o.list]);
          this.tweens.add({ targets: o, scale: 1.25, duration: 70, yoyo: true, onComplete: () => this.tweens.add({ targets: o, scale: 0, angle: 90, duration: 120, onComplete: () => this.quitar(o) }) });
        }
        this.piezas[i] = null;
      }
      sonar('pop');
      aplicarPaso(this.t, p);
      // Los especiales que nacen se quedan en su casilla, con un golpe de luz.
      for (const n of p.nuevas) {
        let o = this.piezas[n.i];
        if (!o) o = this.piezas[n.i] = this.crearPieza(n.tipo, n.i);
        this.decorar(o, n.esp);
        const q = this.pos(n.i);
        onda(this, q.x, q.y, 0xffe27a, 40, 420, 3);
        rebote(this, o, 1.3, 180);
      }
      await this.espera(p.activadas.length ? 320 : 220);
      // Caen los que quedan y llegan productos nuevos desde arriba.
      const viejas = [...this.piezas];
      const desde = caer(this.t, this.tipos);
      const nuevas: (Phaser.GameObjects.Container | null)[] = new Array(this.t.celdas.length).fill(null);
      const mover: Phaser.GameObjects.Container[] = [];
      const destinos: number[] = [];
      const cayeron: Phaser.GameObjects.Container[] = [];
      for (let i = 0; i < this.t.celdas.length; i++) {
        const x = i % COLS;
        const d = desde[i];
        const img = d >= 0 ? viejas[d * COLS + x]! : this.crearPieza(this.t.celdas[i], i, d);
        if (d >= 0 && d !== Math.floor(i / COLS)) cayeron.push(img);
        nuevas[i] = img;
        mover.push(img);
        destinos.push(i);
      }
      this.piezas = nuevas;
      await this.mover(mover, destinos, 260);
      // Al aterrizar, se aplastan un poquito.
      for (const o of cayeron) rebote(this, o, 1.12, 90);
      cascada += 1;
    }
    // El combo premia encadenar jugadas: el extra se suma al final de la jugada.
    const total = this.combo.acierto(jugada);
    if (total > jugada) {
      this.puntos += total - jugada;
      this.marcador.puntos(this.puntos);
    }
    if (!hayMovimiento(this.t) && !this.terminado) {
      flotar(this, 'Sin jugadas: ¡a reordenar!', 240, 150, true);
      await this.espera(500);
      this.piezas.forEach((o) => this.quitar(o));
      this.t = tableroNuevo(COLS, FILAS, this.tipos);
      this.piezas = this.t.celdas.map((v, i) => this.crearPieza(v, i));
      this.entrada();
    } else {
      this.ocupado = false;
    }
    this.ultimaAccion = this.reloj;
  }

  /** Si Rupert se queda pensando, las dos piezas de una jugada posible se agitan. */
  private pista(): void {
    const m = buscarMovimiento(this.t);
    if (!m) return;
    for (const i of m) {
      const o = this.piezas[i];
      if (o) this.tweens.add({ targets: o, scale: 1.2, duration: 220, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
    }
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(resta / 1000));
    if (!this.ocupado && this.reloj - this.ultimaAccion > 5000) {
      this.ultimaAccion = this.reloj;
      this.combo.error();
      this.pista();
    }
    if (resta <= 0 && !this.ocupado) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, this.mejorCascada ? `Mejor cascada: ×${this.mejorCascada}` : 'No armaste ninguna línea');
    }
  }
}
