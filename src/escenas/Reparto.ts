import Phaser from 'phaser';
import { ANCHO, E } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 40_000;
/** Línea del suelo (las ruedas apoyan aquí) y posición fija del ciclista. */
const SUELO = 252;
const X_CICLISTA = 96;
const GRAVEDAD = 760;
const SALTO = -360;
/** Tamaño del ciclista respecto del dibujo base (la bici mide 50 px de largo a escala 1). */
const ESCALA = 2.05;

interface Cosa {
  img: Phaser.GameObjects.Image;
  tipo: 'obstaculo' | 'pedido' | 'moneda';
  w: number;
  h: number;
}

/**
 * Reparto en bici: la ciudad pasa de derecha a izquierda; tocar la pantalla hace saltar a Rupert.
 * Los pedidos suman 5, las monedas 2 y chocar con una caja o resbalar con una cáscara resta 4.
 */
export class Reparto extends Phaser.Scene {
  private puntos = 0;
  private reloj = 0;
  private terminado = false;
  private marcador!: Marcador;
  private fondos: Phaser.GameObjects.Image[] = [];
  private ciclista!: Phaser.GameObjects.Container;
  private ruedas!: Phaser.GameObjects.Graphics;
  private piernas!: Phaser.GameObjects.Graphics;
  private y = SUELO;
  private vy = 0;
  private cosas: Cosa[] = [];
  private proxima = 0;
  private invulnerable = 0;
  private entregas = 0;
  private giro = 0;
  private frenado = 0;

  constructor() {
    super('Reparto');
  }

  create(): void {
    this.puntos = 0;
    this.reloj = 0;
    this.terminado = false;
    this.y = SUELO;
    this.vy = 0;
    this.cosas = [];
    this.proxima = 1800;
    this.invulnerable = 0;
    this.entregas = 0;
    this.frenado = 0;
    // Dos copias de la calle, la segunda espejada para que no se note la unión.
    this.fondos = [0, 1].map((i) => this.add.image(i * ANCHO * E, 0, 'ciudad').setOrigin(0).setScale(E).setFlipX(i === 1));
    this.marcador = montarMinijuego(this, 'Reparto en bici', 0, false);
    this.crearCiclista();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y / E > 26) this.saltar();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.saltar());
    this.input.keyboard?.on('keydown-UP', () => this.saltar());
    aviso(this, '¡A repartir! Toca la pantalla para saltar.\nJunta pedidos y monedas, esquiva cajas y cáscaras.', 2200);
  }

  /** Bici dibujada por código con Rupert repartidor encima (provisional hasta tener el dibujo en bici). */
  private crearCiclista(): void {
    const c = this.add.container(X_CICLISTA * E, SUELO * E).setDepth(20).setScale(ESCALA);
    this.ruedas = this.add.graphics();
    this.piernas = this.add.graphics();
    const cuadro = this.add.graphics();
    cuadro.lineStyle(2 * E, 0x2f7a4a, 1);
    // Cuadro: rueda trasera (-16,-9), pedalier (-2,-9), rueda delantera (16,-9), asiento (-8,-26), manubrio (12,-28).
    cuadro.lineBetween(-16 * E, -9 * E, -2 * E, -9 * E);
    cuadro.lineBetween(-2 * E, -9 * E, -8 * E, -26 * E);
    cuadro.lineBetween(-16 * E, -9 * E, -8 * E, -26 * E);
    cuadro.lineBetween(-8 * E, -24 * E, 11 * E, -24 * E);
    cuadro.lineBetween(-2 * E, -9 * E, 11 * E, -24 * E);
    cuadro.lineBetween(11 * E, -24 * E, 16 * E, -9 * E);
    cuadro.lineBetween(11 * E, -24 * E, 12 * E, -30 * E);
    cuadro.fillStyle(0x1b1424, 1).fillRect(-12 * E, -28 * E, 8 * E, 3 * E);
    cuadro.fillStyle(0x1b1424, 1).fillRect(9 * E, -32 * E, 7 * E, 3 * E);
    // Rupert repartidor: medio cuerpo de su dibujo de etapa 5, sentado en el asiento.
    const clave = this.textures.exists('e5_quieto_34') ? 'e5_quieto_34' : 'e0_quieto_34';
    const cuerpo = this.add.image(-4 * E, -24 * E, clave, 0).setOrigin(0.5, 1).setScale(E * 0.62);
    cuerpo.setCrop(0, 0, cuerpo.width, cuerpo.height * 0.56);
    cuerpo.setY((-24 + cuerpo.height * 0.62 * 0.44) * E);
    c.add([this.ruedas, this.piernas, cuadro, cuerpo]);
    this.ciclista = c;
  }

  private dibujarRuedasYPiernas(): void {
    const g = this.ruedas;
    g.clear();
    for (const cx of [-16, 16]) {
      g.lineStyle(2 * E, 0x1b1424, 1).strokeCircle(cx * E, -9 * E, 9 * E);
      g.lineStyle(E, 0x9aa3ad, 1);
      for (let k = 0; k < 3; k++) {
        const a = this.giro + (k * Math.PI) / 3;
        g.lineBetween((cx + Math.cos(a) * 8) * E, (-9 + Math.sin(a) * 8) * E, (cx - Math.cos(a) * 8) * E, (-9 - Math.sin(a) * 8) * E);
      }
    }
    // Piernas pedaleando: de la cadera a cada pedal, que giran alrededor del pedalier.
    const p = this.piernas;
    p.clear();
    for (const fase of [0, Math.PI]) {
      const a = this.giro * 0.8 + fase;
      const px = -2 + Math.cos(a) * 5;
      const py = -9 + Math.sin(a) * 5;
      const rodX = (-8 + px) / 2 + 5;
      const rodY = (-24 + py) / 2 - 2;
      p.lineStyle(3 * E, fase === 0 ? 0x6b5a44 : 0x55473a, 1);
      p.lineBetween(-8 * E, -24 * E, rodX * E, rodY * E);
      p.lineBetween(rodX * E, rodY * E, px * E, py * E);
      p.fillStyle(0xe8e2d8, 1).fillRect((px - 2) * E, (py - 1) * E, 4 * E, 2 * E);
    }
  }

  private saltar(): void {
    if (this.terminado) return;
    if (this.y >= SUELO - 0.5) this.vy = SALTO;
  }

  private velocidad(): number {
    // De 90 a 170 px/s a lo largo de la partida; tras un choque, frena un momento.
    const base = 90 + 80 * Math.min(1, this.reloj / DURACION);
    return this.frenado > 0 ? base * 0.55 : base;
  }

  private aparecer(): void {
    const r = Math.random();
    let tipo: Cosa['tipo'];
    let clave: string;
    let alto = 0;
    if (r < 0.45) {
      tipo = 'obstaculo';
      clave = Math.random() < 0.65 ? 'caja' : 'cascara';
    } else if (r < 0.8) {
      tipo = 'pedido';
      clave = Phaser.Utils.Array.GetRandom(['sandwich', 'sopa', 'cafe', 'manzana']);
      alto = Math.random() < 0.5 ? 0 : 62; // algunos pedidos hay que saltarlos para agarrarlos
    } else {
      tipo = 'moneda';
      clave = 'moneda';
      alto = Phaser.Utils.Array.GetRandom([0, 40, 72]);
    }
    const escala = tipo === 'obstaculo' ? 1.9 : 1.45;
    const img = this.add.image((ANCHO + 20) * E, (SUELO - alto) * E, clave).setOrigin(0.5, 1).setScale(E * escala).setDepth(15);
    if (tipo !== 'obstaculo') this.tweens.add({ targets: img, y: img.y - 3 * E, duration: 400, yoyo: true, repeat: -1 });
    this.cosas.push({ img, tipo, w: (img.width * escala) / 1.4, h: (img.height * escala) / 1.2 });
  }

  private chocar(c: Cosa): void {
    if (c.tipo === 'obstaculo') {
      if (this.invulnerable > 0) return;
      this.puntos -= 4;
      this.invulnerable = 1200;
      this.frenado = 900;
      flotar(this, c.img.texture.key === 'cascara' ? '-4 ¡resbaló!' : '-4 ¡choque!', X_CICLISTA, this.y - 110, false);
      this.cameras.main.shake(150, 0.008);
      this.tweens.add({ targets: c.img, angle: 90, alpha: 0, duration: 300 });
      c.img.setData('usada', true);
    } else {
      const pts = c.tipo === 'pedido' ? 5 : 2;
      if (c.tipo === 'pedido') this.entregas += 1;
      this.puntos += pts;
      flotar(this, c.tipo === 'pedido' ? `+${pts} ¡entregado!` : `+${pts}`, X_CICLISTA + 10, this.y - 110, true);
      this.tweens.killTweensOf(c.img);
      c.img.destroy();
    }
    this.marcador.puntos(this.puntos);
  }

  override update(_t: number, dt: number): void {
    this.giro += (dt / 1000) * (this.terminado ? 0 : this.velocidad() / 9);
    this.dibujarRuedasYPiernas();
    if (this.terminado) return;
    this.reloj += dt;
    const s = dt / 1000;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.frenado = Math.max(0, this.frenado - dt);
    const resta = Math.max(0, DURACION + 1500 - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Entregaste ${this.entregas} pedidos`);
      return;
    }
    // Salto con gravedad.
    this.vy += GRAVEDAD * s;
    this.y = Math.min(SUELO, this.y + this.vy * s);
    if (this.y >= SUELO) this.vy = 0;
    this.ciclista.setY(this.y * E).setAlpha(this.invulnerable > 0 && Math.floor(this.reloj / 100) % 2 ? 0.4 : 1);
    this.ciclista.setAngle(this.y < SUELO - 1 ? -6 : 0);
    // La calle avanza.
    const v = this.velocidad();
    for (const f of this.fondos) {
      f.x -= v * s * E;
      if (f.x <= -ANCHO * E) f.x += 2 * ANCHO * E;
    }
    if (this.reloj > 1500) {
      this.proxima -= dt;
      if (this.proxima <= 0) {
        this.aparecer();
        this.proxima = Phaser.Math.Between(900, 1600) - 400 * Math.min(1, this.reloj / DURACION);
      }
    }
    // Choques: caja del ciclista contra cada cosa.
    // Caja de choque algo menor que el dibujo, para que los roces no cuenten.
    const ciclo = { x0: X_CICLISTA - 13 * ESCALA, x1: X_CICLISTA + 13 * ESCALA, y0: this.y - 50 * ESCALA, y1: this.y };
    this.cosas = this.cosas.filter((c) => {
      if (!c.img.active) return false;
      c.img.x -= v * s * E;
      const cx = c.img.x / E;
      const cy = c.img.y / E;
      if (c.img.x < -40 * E) {
        c.img.destroy();
        return false;
      }
      if (!c.img.getData('usada') && cx + c.w / 2 > ciclo.x0 && cx - c.w / 2 < ciclo.x1 && cy > ciclo.y0 && cy - c.h < ciclo.y1) {
        this.chocar(c);
        return c.tipo === 'obstaculo';
      }
      return true;
    });
  }
}
