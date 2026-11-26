import Phaser from 'phaser';
import { ALTO, ANCHO, E } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

interface Tipo {
  clave: string;
  puntos: number;
  peso: number;
}

/** Lo que sale del contenedor: lo bueno suma, la cáscara y la espina restan. */
export const TIPOS: Tipo[] = [
  { clave: 'lata', puntos: 3, peso: 30 },
  { clave: 'botella_plastico', puntos: 2, peso: 24 },
  { clave: 'botella', puntos: 5, peso: 14 },
  { clave: 'caja', puntos: 4, peso: 12 },
  { clave: 'moneda', puntos: 10, peso: 7 },
  { clave: 'anillo', puntos: 25, peso: 2 },
  { clave: 'cascara', puntos: -4, peso: 15 },
  { clave: 'espina', puntos: -6, peso: 10 },
];

const DURACION = 30_000;
/** Boca del contenedor en el mundo 480×270. */
const BOCA = { x: 350, y: 100 };

function sortear(): Tipo {
  const total = TIPOS.reduce((s, t) => s + t.peso, 0);
  let r = Math.random() * total;
  for (const t of TIPOS) {
    r -= t.peso;
    if (r <= 0) return t;
  }
  return TIPOS[0];
}

export class Basura extends Phaser.Scene {
  private puntos = 0;
  private fin = 0;
  private terminado = false;
  private marcador!: Marcador;
  private proximo = 0;

  constructor() {
    super('Basura');
  }

  create(): void {
    this.puntos = 0;
    this.terminado = false;
    this.fin = this.time.now + DURACION + 1500;
    this.proximo = this.time.now + 1500;
    this.marcador = montarMinijuego(this, 'Buscar en la basura');
    aviso(this, '¡Toca lo que sirve!\nEvita la cáscara y la espina.');
  }

  private lanzar(): void {
    const t = sortear();
    const img = this.add.image(BOCA.x * E, BOCA.y * E, t.clave).setScale(E * 1.5).setInteractive({ useHandCursor: true }).setDepth(5);
    // Arco: sube y cae hacia un punto al azar de la pantalla.
    const destinoX = Phaser.Math.Between(40, ANCHO - 40);
    const alto = Phaser.Math.Between(50, 90);
    const dur = Phaser.Math.Between(1700, 2600);
    this.tweens.add({ targets: img, x: destinoX * E, duration: dur, ease: 'Linear' });
    this.tweens.add({
      targets: img,
      y: alto * E,
      duration: dur * 0.4,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: img, y: (ALTO + 30) * E, duration: dur * 0.6, ease: 'Quad.easeIn', onComplete: () => img.destroy() });
      },
    });
    this.tweens.add({ targets: img, angle: Phaser.Math.Between(-200, 200), duration: dur });
    img.once('pointerdown', () => {
      if (this.terminado) return;
      this.puntos += t.puntos;
      this.marcador.puntos(this.puntos);
      flotar(this, t.puntos > 0 ? `+${t.puntos}` : String(t.puntos), img.x / E, img.y / E, t.puntos > 0);
      this.tweens.killTweensOf(img);
      this.tweens.add({ targets: img, scale: 0, duration: 120, onComplete: () => img.destroy() });
      if (t.puntos < 0) this.cameras.main.shake(120, 0.006);
    });
  }

  override update(t: number): void {
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - t);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos);
      return;
    }
    if (t >= this.proximo && resta > 400) {
      this.lanzar();
      // Cada vez más rápido: de 900 ms a 450 ms entre objetos.
      const avance = 1 - resta / DURACION;
      this.proximo = t + 900 - 450 * Math.min(1, avance);
    }
  }
}
