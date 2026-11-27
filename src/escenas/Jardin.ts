import Phaser from 'phaser';
import { sonar } from '../audio/sonido';
import { E } from '../ui/ui';
import { brillo, confeti, estallido, onda, polvo, rebote, salpicadura } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, ritmo, terminarMinijuego } from './comun';

const DURACION = 50_000;
/** Canteros del jardín (px del mundo): sobre el pasto del fondo de la casa. */
const CANTEROS = [62, 138, 214, 290, 366, 432].map((x, i) => ({ x, y: i % 2 ? 214 : 236 }));
/** Segundos que espera cada problema antes de hacer daño. */
const ESPERA = 4.2;

type Problema = 'sed' | 'yuyo' | 'paloma' | null;

interface Cantero {
  x: number;
  y: number;
  /** Cuánto creció la planta (0 brote, 1 y 2 más grande, 3 en flor). */
  crece: number;
  problema: Problema;
  desde: number;
  planta: Phaser.GameObjects.Image;
  marca: Phaser.GameObjects.Container | null;
}

/**
 * Cuidar el jardín (R044, etapa 9): en cada cantero aparecen problemas. Tocar el cantero los resuelve:
 * regar si tiene sed (la planta crece y a la tercera florece), arrancar el yuyo o espantar la paloma. Si un
 * problema se deja, hace daño: la planta se marchita o la paloma se come el brote.
 * Arte provisorio: la planta y la flor del juego, la paloma, y el yuyo y la gota dibujados por código.
 */
export class Jardin extends Phaser.Scene {
  private puntos = 0;
  private flores = 0;
  private reloj = 0;
  private fin = 0;
  private proximo = 0;
  private terminado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private canteros: Cantero[] = [];

  constructor() {
    super('Jardin');
  }

  create(): void {
    this.puntos = 0;
    this.flores = 0;
    this.reloj = 0;
    this.proximo = 1.6;
    this.terminado = false;
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Cuidar el jardín', 0.2, false);
    // El jardín de la casa propia, con los canteros de tierra encima.
    this.add.image(0, 0, 'casa').setOrigin(0).setScale(E).setDepth(-5);
    this.combo = new Combo(this);
    const g = this.add.graphics().setDepth(1);
    this.canteros = CANTEROS.map(({ x, y }) => {
      g.fillStyle(0x3a2416, 1).fillEllipse(x * E, (y + 2) * E, 56 * E, 16 * E);
      g.fillStyle(0x5a3a22, 1).fillEllipse(x * E, y * E, 50 * E, 12 * E);
      const planta = this.add.image(x * E, y * E, 'planta').setOrigin(0.5, 0.95).setDepth(y);
      const c: Cantero = { x, y, crece: 0, problema: null, desde: 0, planta, marca: null };
      this.dibujarPlanta(c);
      const z = this.add.zone(x * E, (y - 22) * E, 70 * E, 70 * E).setInteractive().setDepth(300);
      z.on('pointerdown', () => this.tocar(c));
      return c;
    });
    aviso(this, 'Toca cada cantero para regarlo, sacar el yuyo\no espantar la paloma. Mi primer jardín. Mi primer enemigo.', 2400);
  }

  private dibujarPlanta(c: Cantero): void {
    const flor = c.crece >= 3;
    c.planta.setTexture(flor && this.textures.exists('flor') ? 'flor' : 'planta');
    const alto = flor ? 40 : 14 + c.crece * 8;
    c.planta.setScale((alto * E) / c.planta.height);
    c.planta.clearTint();
  }

  /** Aparece un problema en un cantero libre. */
  private nuevoProblema(): void {
    const libres = this.canteros.filter((c) => !c.problema);
    if (!libres.length) return;
    const c = libres[Math.floor(Math.random() * libres.length)];
    const r = Math.random();
    c.problema = r < 0.5 ? 'sed' : r < 0.78 ? 'yuyo' : 'paloma';
    c.desde = this.reloj;
    const m = this.add.container(c.x * E, (c.y - 48) * E).setDepth(400);
    if (c.problema === 'sed') {
      const g = this.add.graphics();
      g.fillStyle(0x3f9cff, 1).fillCircle(0, 4 * E, 6 * E).fillTriangle(-6 * E, 2 * E, 6 * E, 2 * E, 0, -9 * E);
      g.fillStyle(0xffffff, 0.7).fillCircle(-2 * E, 3 * E, 2 * E);
      m.add(g);
      c.planta.setTint(0xc9b46a);
    } else if (c.problema === 'yuyo') {
      const g = this.add.graphics();
      for (let k = -3; k <= 3; k++) g.fillStyle(k % 2 ? 0x4f8a2f : 0x6aa83a, 1).fillTriangle((k * 4 - 3) * E, 38 * E, (k * 4 + 3) * E, 38 * E, (k * 5) * E, (18 + Math.abs(k) * 3) * E);
      m.add(g);
      m.y = (c.y - 36) * E;
    } else {
      const p = this.add.image(18 * E, 34 * E, 'paloma').setOrigin(0.5, 1);
      p.setScale((22 * E) / p.height);
      m.add(p);
      this.tweens.add({ targets: p, angle: 12, duration: 180, yoyo: true, repeat: -1 });
      sonar('aviso');
    }
    m.setScale(0);
    this.tweens.add({ targets: m, scale: 1, duration: 200, ease: 'Back.easeOut' });
    c.marca = m;
  }

  private resolver(c: Cantero): void {
    c.marca?.destroy();
    c.marca = null;
    c.problema = null;
  }

  private tocar(c: Cantero): void {
    if (this.terminado) return;
    const x = c.x * E;
    const y = (c.y - 20) * E;
    if (!c.problema) {
      flotar(this, al(['Está bien así', 'No la agobies', 'Crece a su ritmo']), c.x, c.y - 50, false, false);
      return;
    }
    const rapido = this.reloj - c.desde < 1.5;
    if (c.problema === 'sed') {
      c.crece = Math.min(3, c.crece + 1);
      this.dibujarPlanta(c);
      salpicadura(this, x, y);
      sonar('agua');
      if (c.crece === 3) {
        this.flores += 1;
        confeti(this, x, y, 16);
        brillo(this, x, y - 10 * E);
        sonar('festejo');
        flotar(this, '¡Floreció! +10', c.x, c.y - 70, true, false);
        this.puntos += 10;
        // Una flor nueva vuelve a brotar al rato: el jardín nunca se termina.
        this.time.delayedCall(2600, () => {
          c.crece = 0;
          this.dibujarPlanta(c);
        });
      }
    } else if (c.problema === 'yuyo') {
      estallido(this, x, (c.y - 4) * E, { textura: 'fx_px', colores: [0x5a3a22, 0x4f8a2f, 0x3a2416], cantidad: 12, velocidad: [40, 110], vida: 420, gravedad: 200 });
      sonar('pop');
    } else {
      const p = this.add.image(x + 18 * E, y, this.textures.exists('paloma_vuela') ? 'paloma_vuela' : 'paloma');
      p.setScale((24 * E) / p.height).setDepth(500);
      this.tweens.add({ targets: p, x: p.x + 160 * E, y: p.y - 160 * E, duration: 700, ease: 'Quad.easeIn', onComplete: () => p.destroy() });
      sonar('salto');
    }
    this.resolver(c);
    rebote(this, c.planta, 1.12, 90);
    const pts = this.combo.acierto(rapido ? 5 : 3);
    this.puntos += pts;
    this.marcador.puntos(this.puntos);
    flotar(this, `+${pts}`, c.x, c.y - 44, true);
  }

  /** El problema que nadie atendió hace daño. */
  private dano(c: Cantero): void {
    const x = c.x * E;
    const y = (c.y - 20) * E;
    const que = c.problema;
    this.resolver(c);
    this.combo.error();
    this.puntos = Math.max(0, this.puntos - 2);
    this.marcador.puntos(this.puntos);
    if (que === 'sed') flotar(this, 'Se marchitó un poco', c.x, c.y - 50, false);
    else if (que === 'yuyo') flotar(this, 'El yuyo ganó esta', c.x, c.y - 50, false);
    else flotar(this, 'La paloma se comió el brote', c.x, c.y - 50, false);
    c.crece = Math.max(0, c.crece - 1);
    this.dibujarPlanta(c);
    polvo(this, x, y);
    onda(this, x, y, 0xff6b5b, 20, 300, 2);
  }

  override update(_t: number, dt: number): void {
    if (this.terminado) return;
    const s = dt / 1000;
    this.reloj += s;
    this.proximo -= s;
    if (this.proximo <= 0) {
      this.nuevoProblema();
      // Cada vez aparecen más seguido (de 1,6 s a 0,7 s), y más rápido en etapas altas.
      this.proximo = Math.max(0.7, 1.6 - this.reloj * 0.02) / Math.sqrt(ritmo());
    }
    for (const c of this.canteros) {
      if (!c.problema) continue;
      const espera = this.reloj - c.desde;
      if (c.marca) c.marca.setAlpha(espera > ESPERA * 0.7 ? 0.5 + 0.5 * Math.abs(Math.sin(espera * 10)) : 1);
      if (espera > ESPERA) this.dano(c);
    }
    const resta = Math.max(0, this.fin - this.reloj * 1000);
    this.marcador.tiempo(Math.ceil(resta / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Florecieron ${this.flores} ${this.flores === 1 ? 'planta' : 'plantas'}`);
    }
  }
}

function al<T>(l: T[]): T {
  return l[Math.floor(Math.random() * l.length)];
}

