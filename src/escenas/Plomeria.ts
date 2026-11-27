import Phaser from 'phaser';
import { ES, N, O, S, type Canerias, girar, nivelCanerias, puntosCanerias } from '../core/rompecabezas';
import { E, texto } from '../ui/ui';
import { brillo, confeti, estallido, onda, rebote, salpicadura } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, ritmo, terminarMinijuego } from './comun';

const DURACION = 60_000;
/** Segundos extra por cada cañería resuelta. */
const PREMIO_TIEMPO = 6_000;
const AGUA = 0x3f9cff;
const AGUA_CLARA = 0x9fd4ff;
const CANO = 0x8a929c;
const DIRS = [
  { bit: N, dx: 0, dy: -1, op: S },
  { bit: ES, dx: 1, dy: 0, op: O },
  { bit: S, dx: 0, dy: 1, op: N },
  { bit: O, dx: -1, dy: 0, op: ES },
];

interface Mojada {
  /** Distancia (en caños) desde la canilla: ordena la ola de llenado. */
  dist: number;
  /** Abertura por la que entra el agua a este caño. */
  entra: number;
}

/**
 * Changa de plomería (R026, R028): girar los caños tocándolos hasta que el agua llegue de la canilla al desagüe.
 * El agua llena los caños como una ola, corre con burbujas en el sentido del flujo y gotea por las
 * pérdidas. Cada cañería resuelta da tiempo extra y la siguiente es más grande.
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
  private t: Canerias | null = null;
  private capa!: Phaser.GameObjects.Container;
  private tiles: Phaser.GameObjects.Container[] = [];
  private agua: Phaser.GameObjects.Graphics[] = [];
  private flujo!: Phaser.GameObjects.Graphics;
  private mojadas = new Map<number, Mojada>();
  private proximaGota = 0;
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
    this.t = null;
    this.mojadas = new Map();
    this.fin = DURACION / Math.sqrt(ritmo()) + 1500;
    this.marcador = montarMinijuego(this, 'Changa de plomería', 0.65);
    this.combo = new Combo(this);
    this.capa = this.add.container(0, 0);
    this.flujo = this.add.graphics().setDepth(8);
    aviso(this, 'Toca los caños para girarlos. Lleva el agua\nde la canilla al desagüe. Sin mojarme, eh.', 2000);
    this.time.delayedCall(1500, () => this.nuevoNivel());
  }

  private centro(i: number): { x: number; y: number } {
    const t = this.t!;
    return { x: this.x0 + ((i % t.cols) + 0.5) * this.tam, y: this.y0 + (Math.floor(i / t.cols) + 0.5) * this.tam };
  }

  private nuevoNivel(): void {
    if (this.terminado) return;
    const t = nivelCanerias(this.nivel);
    this.t = t;
    this.resuelto = false;
    this.desde = this.reloj;
    this.mojadas = new Map();
    this.tam = Math.min(40, Math.floor(360 / t.cols), Math.floor(190 / t.filas));
    this.x0 = 240 - (t.cols * this.tam) / 2;
    this.y0 = 60 + (196 - t.filas * this.tam) / 2;
    this.capa.removeAll(true);
    this.tiles = [];
    this.agua = [];
    // Canilla a la izquierda (con su llave roja) y desagüe a la derecha.
    const g = this.add.graphics();
    const yIn = this.y0 + (t.entrada + 0.5) * this.tam;
    const yOut = this.y0 + (t.salida + 0.5) * this.tam;
    const xOut = this.x0 + t.cols * this.tam;
    g.fillStyle(0x1b1424, 1).fillRect((this.x0 - 25) * E, (yIn - 7) * E, 26 * E, 14 * E);
    g.fillStyle(0x9aa3ad, 1).fillRect((this.x0 - 24) * E, (yIn - 6) * E, 24 * E, 12 * E);
    g.fillStyle(0xc7cfd8, 1).fillRect((this.x0 - 34) * E, (yIn - 12) * E, 12 * E, 24 * E);
    g.fillStyle(0xe05a4f, 1).fillRect((this.x0 - 37) * E, (yIn - 16) * E, 18 * E, 5 * E);
    g.fillStyle(0x1b1424, 1).fillRect(xOut * E, (yOut - 7) * E, 24 * E, 14 * E);
    g.fillStyle(0x9aa3ad, 1).fillRect(xOut * E, (yOut - 6) * E, 22 * E, 12 * E);
    g.fillStyle(0x2a2a30, 1).fillCircle((xOut + 30) * E, yOut * E, 10 * E);
    g.fillStyle(0x15151a, 1).fillCircle((xOut + 30) * E, yOut * E, 6 * E);
    this.capa.add(g);
    this.capa.add(texto(this, this.x0 - 28, yIn + 14, 'Canilla', { tam: 8, color: '#c9b9a6' }).setOrigin(0.5, 0));
    this.capa.add(texto(this, xOut + 30, yOut + 12, 'Desagüe', { tam: 8, color: '#c9b9a6' }).setOrigin(0.5, 0));

    for (let i = 0; i < t.celdas.length; i++) {
      const p = this.centro(i);
      const c = this.add.container(p.x * E, p.y * E);
      const base = this.add.graphics().setName('caño');
      const agua = this.add.graphics().setAlpha(0);
      const zona = this.add.zone(0, 0, this.tam * E, this.tam * E).setInteractive({ useHandCursor: true });
      zona.on('pointerdown', () => this.tocar(i));
      c.add([base, agua, zona]);
      this.tiles.push(c);
      this.agua.push(agua);
      this.capa.add(c);
      this.dibujarCano(i);
      // Los caños aparecen uno tras otro, con un saltito.
      c.setScale(0);
      this.tweens.add({ targets: c, scale: 1, duration: 260, delay: ((i % t.cols) + Math.floor(i / t.cols)) * 35, ease: 'Back.easeOut' });
    }
    this.actualizarAgua(true);
  }

  /** Brazos de un caño (en coordenadas del caño, centrado). */
  private brazos(g: Phaser.GameObjects.Graphics, ab: number, ancho: number, color: number, borde?: number): void {
    const T = this.tam;
    const a = ancho;
    const brazo = (dx: number, dy: number) => {
      const x = dx === 0 ? -a / 2 : dx > 0 ? 0 : -T / 2;
      const y = dy === 0 ? -a / 2 : dy > 0 ? 0 : -T / 2;
      const w = dx === 0 ? a : T / 2;
      const h = dy === 0 ? a : T / 2;
      if (borde !== undefined) g.fillStyle(borde, 1).fillRect((x - 1) * E, (y - 1) * E, (w + 2) * E, (h + 2) * E);
      g.fillStyle(color, 1).fillRect(x * E, y * E, w * E, h * E);
    };
    if (ab & N) brazo(0, -1);
    if (ab & ES) brazo(1, 0);
    if (ab & S) brazo(0, 1);
    if (ab & O) brazo(-1, 0);
    g.fillStyle(color, 1).fillCircle(0, 0, a * 0.62 * E);
  }

  /** Caño seco (metal con brillo) y, encima, su capa de agua (visible según esté mojado). */
  private dibujarCano(i: number): void {
    const T = this.tam;
    const a = T * 0.32;
    const ab = this.t!.celdas[i];
    const base = this.tiles[i].getByName('caño') as Phaser.GameObjects.Graphics;
    base.clear();
    base.fillStyle(0x2a2030, 1).fillRoundedRect((-T / 2 + 1) * E, (-T / 2 + 1) * E, (T - 2) * E, (T - 2) * E, 3 * E);
    this.brazos(base, ab, a, CANO, 0x1b1424);
    this.brazos(base, ab, a * 0.25, 0xc7cfd8);
    const agua = this.agua[i];
    agua.clear();
    this.brazos(agua, ab, a * 0.72, AGUA);
    this.brazos(agua, ab, a * 0.22, AGUA_CLARA);
  }

  /** Recorre el agua desde la canilla: cada caño mojado guarda su distancia y por dónde entra. */
  private recorrerAgua(): { mojadas: Map<number, Mojada>; llega: boolean } {
    const m = new Map<number, Mojada>();
    const t = this.t!;
    const inicio = t.entrada * t.cols;
    let llega = false;
    if (!(t.celdas[inicio] & O)) return { mojadas: m, llega };
    m.set(inicio, { dist: 0, entra: O });
    const cola = [inicio];
    while (cola.length) {
      const i = cola.shift()!;
      const x = i % t.cols;
      const y = Math.floor(i / t.cols);
      if (x === t.cols - 1 && y === t.salida && t.celdas[i] & ES) llega = true;
      for (const d of DIRS) {
        if (!(t.celdas[i] & d.bit)) continue;
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (nx < 0 || nx >= t.cols || ny < 0 || ny >= t.filas) continue;
        const j = ny * t.cols + nx;
        if (!m.has(j) && t.celdas[j] & d.op) {
          m.set(j, { dist: m.get(i)!.dist + 1, entra: d.op });
          cola.push(j);
        }
      }
    }
    return { mojadas: m, llega };
  }

  /** Llena como una ola los caños a los que llega agua nueva y vacía los que se quedaron sin. */
  private actualizarAgua(inicio = false): boolean {
    const { mojadas, llega } = this.recorrerAgua();
    const antes = this.mojadas;
    const nuevas = [...mojadas.keys()].filter((i) => !antes.has(i));
    const minDist = Math.min(...nuevas.map((i) => mojadas.get(i)!.dist), Infinity);
    for (const i of nuevas) {
      const demora = inicio ? 400 + mojadas.get(i)!.dist * 70 : (mojadas.get(i)!.dist - minDist) * 70;
      this.tweens.killTweensOf(this.agua[i]);
      this.tweens.add({
        targets: this.agua[i], alpha: 1, duration: 160, delay: demora,
        onStart: () => !inicio && rebote(this, this.tiles[i], 1.08, 90),
      });
    }
    for (const i of antes.keys()) {
      if (mojadas.has(i)) continue;
      this.tweens.killTweensOf(this.agua[i]);
      this.tweens.add({ targets: this.agua[i], alpha: 0, duration: 140 });
    }
    this.mojadas = mojadas;
    return llega;
  }

  private tocar(i: number): void {
    if (this.terminado || this.resuelto || !this.t) return;
    this.t.celdas[i] = girar(this.t.celdas[i]);
    const c = this.tiles[i];
    this.dibujarCano(i);
    // El caño, ya dibujado en su nueva posición, arranca girado −90° y termina de girar con un rebote.
    this.tweens.killTweensOf(c);
    c.setScale(1).setAngle(-90);
    this.tweens.add({ targets: c, angle: 0, duration: 150, ease: 'Back.easeOut' });
    const p = this.centro(i);
    estallido(this, p.x * E, p.y * E, { textura: 'fx_px', colores: [0xc7cfd8, 0x8a929c], cantidad: 4, velocidad: [20, 50], vida: 250 });
    if (this.actualizarAgua()) this.resolver();
  }

  private resolver(): void {
    const t = this.t!;
    this.resuelto = true;
    const seg = (this.reloj - this.desde) / 1000;
    const p = this.combo.acierto(puntosCanerias(this.nivel, seg));
    this.puntos += p;
    this.marcador.puntos(this.puntos);
    this.fin += PREMIO_TIEMPO;
    flotar(this, `+${p} ¡Corre el agua! +6 s`, 240, 52, true);
    // Una onda clara recorre el camino del agua y después sale a chorros por el desagüe.
    const orden = [...this.mojadas.entries()].sort((a, b) => a[1].dist - b[1].dist);
    for (const [i, m] of orden) {
      this.time.delayedCall(m.dist * 45, () => {
        const q = this.centro(i);
        onda(this, q.x * E, q.y * E, AGUA_CLARA, this.tam * 0.5, 300);
      });
    }
    const xOut = (this.x0 + t.cols * this.tam + 30) * E;
    const yOut = (this.y0 + (t.salida + 0.5) * this.tam) * E;
    const ultimo = (orden[orden.length - 1]?.[1].dist ?? 0) * 45;
    for (let k = 0; k < 4; k++) this.time.delayedCall(ultimo + k * 120, () => salpicadura(this, xOut, yOut - 4 * E, 10, [220, 320]));
    this.time.delayedCall(ultimo, () => {
      this.cameras.main.flash(160, 90, 160, 255, false);
      brillo(this, xOut, yOut, [AGUA_CLARA, 0xffffff, AGUA]);
      confeti(this, 240 * E, 60 * E, 18);
    });
    this.nivel += 1;
    this.time.delayedCall(ultimo + 900, () => {
      this.tweens.add({
        targets: this.capa, alpha: 0, duration: 180,
        onComplete: () => {
          this.capa.setAlpha(1);
          this.nuevoNivel();
        },
      });
    });
  }

  /** Burbujas que corren dentro de los caños mojados (en el sentido del agua) y el chorro de la canilla. */
  private dibujarFlujo(): void {
    this.flujo.clear();
    const t = this.t;
    if (!t) return;
    const T = this.tam;
    const fase = (this.reloj / 600) % 1;
    for (const [i, m] of this.mojadas) {
      if (this.agua[i].alpha < 0.6 || this.tiles[i].angle !== 0 || this.tiles[i].scale !== 1) continue;
      const c = this.centro(i);
      const ab = t.celdas[i];
      for (const d of DIRS) {
        if (!(ab & d.bit)) continue;
        const entra = d.bit === m.entra;
        for (let k = 0; k < 2; k++) {
          // Entrando: del borde al centro; saliendo: del centro al borde.
          let f = (fase + k * 0.5) % 1;
          if (entra) f = 1 - f;
          const x = c.x + d.dx * f * (T / 2);
          const y = c.y + d.dy * f * (T / 2);
          this.flujo.fillStyle(0xffffff, 0.8).fillRect((x - 1) * E, (y - 1) * E, 2 * E, 2 * E);
        }
      }
    }
    // Chorro de la canilla: más grueso si el agua entra al primer caño.
    const yIn = this.y0 + (t.entrada + 0.5) * T;
    const ancho = (this.mojadas.size ? 3.4 : 1.6) + Math.sin(this.reloj / 90) * 0.6;
    this.flujo.fillStyle(AGUA, 0.95).fillRect((this.x0 - 4) * E, (yIn - ancho / 2) * E, 5 * E, ancho * E);
    if (!this.mojadas.size) {
      // Sin caño que reciba el agua, la canilla gotea al piso.
      const f = (this.reloj / 500) % 1;
      this.flujo.fillStyle(AGUA_CLARA, 1 - f).fillRect((this.x0 - 2) * E, (yIn + 4 + f * 16) * E, 2 * E, 3 * E);
    }
  }

  /** Gotea por los extremos de caños mojados que no siguen a ningún lado (las pérdidas). */
  private gotear(): void {
    const t = this.t!;
    const fugas: { x: number; y: number }[] = [];
    for (const [i] of this.mojadas) {
      if (this.agua[i].alpha < 0.9) continue;
      const x = i % t.cols;
      const y = Math.floor(i / t.cols);
      for (const d of DIRS) {
        if (!(t.celdas[i] & d.bit)) continue;
        const nx = x + d.dx;
        const ny = y + d.dy;
        const esEntrada = x === 0 && y === t.entrada && d.bit === O;
        const esSalida = x === t.cols - 1 && y === t.salida && d.bit === ES;
        const dentro = nx >= 0 && nx < t.cols && ny >= 0 && ny < t.filas;
        const conecta = dentro && t.celdas[ny * t.cols + nx] & d.op;
        if (!esEntrada && !esSalida && !conecta) {
          const c = this.centro(i);
          fugas.push({ x: c.x + (d.dx * this.tam) / 2, y: c.y + (d.dy * this.tam) / 2 });
        }
      }
    }
    if (!fugas.length) return;
    const f = fugas[Math.floor(Math.random() * fugas.length)];
    estallido(this, f.x * E, f.y * E, {
      textura: 'fx_gota', colores: [AGUA, AGUA_CLARA], cantidad: 2, velocidad: [10, 40], vida: 600, gravedad: 300, angulo: [60, 120], escala: 1.2, profundidad: 9,
    });
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    this.dibujarFlujo();
    if (this.terminado) return;
    if (!this.resuelto && this.t && this.reloj >= this.proximaGota) {
      this.proximaGota = this.reloj + 260;
      this.gotear();
    }
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(resta / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Arreglaste ${this.nivel} cañerías`);
    }
  }
}
