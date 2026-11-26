import Phaser from 'phaser';
import { ANCHO, E } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 40_000;
/** Línea del suelo (las ruedas apoyan aquí) y posición fija del ciclista. */
const SUELO = 252;
const X_CICLISTA = 96;
const GRAVEDAD = 760;
const SALTO = -360;

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
  private ciclista!: Phaser.GameObjects.Sprite;
  private y = SUELO;
  private vy = 0;
  private cosas: Cosa[] = [];
  private proxima = 0;
  private invulnerable = 0;
  private entregas = 0;
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

  /** Rupert repartidor pedaleando (4 cuadros); la animación va más rápido cuanto más rápido va la calle. */
  private crearCiclista(): void {
    if (!this.anims.exists('bici')) {
      this.anims.create({ key: 'bici', frames: this.anims.generateFrameNumbers('rupert_bici', {}), frameRate: 8, repeat: -1 });
    }
    this.ciclista = this.add.sprite(X_CICLISTA * E, SUELO * E, 'rupert_bici').setOrigin(0.5, 1).setScale(E).setDepth(20).play('bici');
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
    if (this.terminado) {
      this.ciclista.anims.pause();
      return;
    }
    this.ciclista.anims.timeScale = this.velocidad() / 110;
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
    const ciclo = { x0: X_CICLISTA - 26, x1: X_CICLISTA + 26, y0: this.y - 98, y1: this.y };
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
