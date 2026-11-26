import Phaser from 'phaser';
import { COLOR, E, caja, texto } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 45_000;
const PILA_MAXIMA = 10;
/** Cuánto hay que frotar (en píxeles del mundo) para dejar limpia cada pieza. */
const FROTE = { plato: 260, taza: 190 };
const PUNTOS = { plato: 3, taza: 2 };
const CENTRO = { x: 240, y: 190 };
const ESCURRIDOR = { x: 412, y: 132 };

type Pieza = 'plato' | 'taza';

/** Lavar platos en el bar: frotar con el dedo cada pieza sucia antes de que se apile demasiado. */
export class Platos extends Phaser.Scene {
  private puntos = 0;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private marcador!: Marcador;
  private pila = 0;
  private lavados = 0;
  private proximaLlegada = 0;
  private actual: { tipo: Pieza; limpio: Phaser.GameObjects.Image; sucio: Phaser.GameObjects.Image; resta: number } | null = null;
  private esponja!: Phaser.GameObjects.Image;
  private pilaTexto!: Phaser.GameObjects.Text;
  private pilaImg!: Phaser.GameObjects.Image;
  private barra!: Phaser.GameObjects.Graphics;
  private ultimo: { x: number; y: number } | null = null;

  constructor() {
    super('Platos');
  }

  create(): void {
    this.puntos = 0;
    this.reloj = 0;
    this.fin = DURACION + 1500;
    this.terminado = false;
    this.pila = 3;
    this.lavados = 0;
    this.proximaLlegada = 4000;
    this.actual = null;
    this.ultimo = null;
    this.add.image(0, 0, 'bar_cocina').setOrigin(0).setScale(E);
    this.marcador = montarMinijuego(this, 'Lavar platos', 0, false);
    this.pilaImg = this.add.image(88 * E, 150 * E, 'pila_platos').setOrigin(0.5, 1).setScale(E * 1.3);
    const g = this.add.graphics();
    caja(g, 46, 152, 84, 20, COLOR.panel);
    this.pilaTexto = texto(this, 88, 154, '', { tam: 11, alinear: 'center' }).setOrigin(0.5, 0);
    this.barra = this.add.graphics().setDepth(20);
    this.esponja = this.add.image(0, 0, 'esponja').setScale(E * 1.1).setDepth(30).setVisible(false);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.frotar(p, true));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.frotar(p, false));
    this.input.on('pointerup', () => {
      this.esponja.setVisible(false);
      this.ultimo = null;
    });
    aviso(this, 'Frota cada plato con el dedo hasta dejarlo limpio.\n¡Que no se junten 10 en la pila!', 2400);
    this.refrescarPila();
    this.time.delayedCall(1500, () => this.siguiente());
  }

  private refrescarPila(): void {
    this.pilaTexto.setText(`Por lavar: ${this.pila}`);
    this.pilaTexto.setColor(this.pila >= PILA_MAXIMA - 2 ? COLOR.rojo : COLOR.tinta);
    this.pilaImg.setScale(E * (1 + Math.min(this.pila, PILA_MAXIMA) * 0.06));
  }

  private siguiente(): void {
    if (this.terminado || this.actual || this.pila <= 0) return;
    this.pila -= 1;
    this.refrescarPila();
    const tipo: Pieza = Math.random() < 0.65 ? 'plato' : 'taza';
    const escala = E * (tipo === 'plato' ? 2.3 : 2);
    const limpio = this.add.image(88 * E, 140 * E, `${tipo}_limpio`).setScale(escala * 0.5).setDepth(10);
    const sucio = this.add.image(88 * E, 140 * E, `${tipo}_sucio`).setScale(escala * 0.5).setDepth(11);
    this.tweens.add({ targets: [limpio, sucio], x: CENTRO.x * E, y: CENTRO.y * E, scale: escala, duration: 250, ease: 'Quad.easeOut' });
    this.actual = { tipo, limpio, sucio, resta: FROTE[tipo] };
  }

  private frotar(p: Phaser.Input.Pointer, inicio: boolean): void {
    if (this.terminado) return;
    const x = p.x / E;
    const y = p.y / E;
    this.esponja.setVisible(true).setPosition(p.x, p.y);
    const a = this.actual;
    if (!a || inicio || !this.ultimo) {
      this.ultimo = { x, y };
      return;
    }
    const dist = Math.hypot(x - this.ultimo.x, y - this.ultimo.y);
    this.ultimo = { x, y };
    // Solo cuenta si la esponja está sobre la pieza.
    if (!a.limpio.getBounds().contains(p.x, p.y)) return;
    a.resta -= dist;
    a.sucio.setAlpha(Math.max(0, a.resta / FROTE[a.tipo]));
    if (Math.random() < 0.35) this.burbuja(x, y);
    if (a.resta <= 0) this.listo(a);
  }

  private burbuja(x: number, y: number): void {
    const b = this.add.circle(x * E, y * E, Phaser.Math.Between(2, 4) * E, 0xffffff, 0.8).setStrokeStyle(E, 0xbfe6ff).setDepth(25);
    this.tweens.add({ targets: b, y: b.y - 18 * E, x: b.x + Phaser.Math.Between(-8, 8) * E, alpha: 0, duration: 700, onComplete: () => b.destroy() });
  }

  private listo(a: NonNullable<Platos['actual']>): void {
    this.actual = null;
    a.sucio.destroy();
    this.lavados += 1;
    this.puntos += PUNTOS[a.tipo];
    this.marcador.puntos(this.puntos);
    flotar(this, `+${PUNTOS[a.tipo]}`, CENTRO.x, CENTRO.y - 40, true);
    this.tweens.add({
      targets: a.limpio,
      x: ESCURRIDOR.x * E,
      y: ESCURRIDOR.y * E,
      scale: E * 0.8,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => this.tweens.add({ targets: a.limpio, alpha: 0, duration: 200, onComplete: () => a.limpio.destroy() }),
    });
    this.time.delayedCall(200, () => this.siguiente());
  }

  private terminar(motivo: string): void {
    this.terminado = true;
    this.esponja.setVisible(false);
    this.barra.clear();
    terminarMinijuego(this, this.puntos, `${motivo}\nLavaste ${this.lavados} piezas`);
  }

  override update(_t: number, dt: number): void {
    if (this.terminado) return;
    this.reloj += dt;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    // Llegan platos sucios cada vez más seguido: de 3,2 s a 1,6 s.
    if (this.reloj >= this.proximaLlegada) {
      this.pila += 1;
      this.refrescarPila();
      const avance = Math.min(1, this.reloj / DURACION);
      this.proximaLlegada = this.reloj + 3200 - 1600 * avance;
      if (!this.actual) this.siguiente();
    }
    const a = this.actual;
    this.barra.clear();
    if (a) {
      const p = 1 - Math.max(0, a.resta) / FROTE[a.tipo];
      this.barra.fillStyle(0x000000, 0.6).fillRect((CENTRO.x - 40) * E, (CENTRO.y + 46) * E, 80 * E, 6 * E);
      this.barra.fillStyle(0x8ee07a, 1).fillRect((CENTRO.x - 40) * E, (CENTRO.y + 46) * E, 80 * p * E, 6 * E);
    }
    if (this.pila >= PILA_MAXIMA) this.terminar('¡Se apilaron demasiados platos!');
    else if (resta <= 0) this.terminar('¡Terminó el turno!');
  }
}
