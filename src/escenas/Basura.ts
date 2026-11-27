import Phaser from 'phaser';
import { ALTO, ANCHO, E } from '../ui/ui';
import { Combo, ritmo, type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

interface Tipo {
  clave: string;
  puntos: number;
  peso: number;
}

/** Lo que sale del contenedor: lo bueno suma, la cáscara y la espina restan. */
export const TIPOS: Tipo[] = [
  // Lo que sirve: cuanto más raro, más vale.
  { clave: 'lata', puntos: 3, peso: 22 },
  { clave: 'botella_plastico', puntos: 2, peso: 18 },
  { clave: 'diario', puntos: 2, peso: 14 },
  { clave: 'botella', puntos: 5, peso: 10 },
  { clave: 'caja', puntos: 4, peso: 10 },
  { clave: 'zapato', puntos: 3, peso: 8 },
  { clave: 'peine', puntos: 3, peso: 7 },
  { clave: 'paraguas', puntos: 4, peso: 6 },
  { clave: 'tijeras', puntos: 4, peso: 6 },
  { clave: 'guantes', puntos: 5, peso: 5 },
  { clave: 'gorro', puntos: 6, peso: 5 },
  { clave: 'gorra', puntos: 6, peso: 5 },
  { clave: 'anteojos', puntos: 8, peso: 4 },
  { clave: 'perfume', puntos: 8, peso: 4 },
  { clave: 'moneda', puntos: 10, peso: 5 },
  { clave: 'taza', puntos: 3, peso: 6 },
  { clave: 'patito', puntos: 4, peso: 5 },
  { clave: 'libro', puntos: 4, peso: 5 },
  { clave: 'osito', puntos: 5, peso: 4 },
  { clave: 'autito', puntos: 6, peso: 4 },
  { clave: 'auriculares', puntos: 9, peso: 3 },
  { clave: 'radio', puntos: 10, peso: 2 },
  { clave: 'reloj', puntos: 12, peso: 2 },
  { clave: 'billetera', puntos: 15, peso: 2 },
  { clave: 'anillo', puntos: 25, peso: 1 },
  // Lo que no: resta puntos.
  { clave: 'cascara', puntos: -4, peso: 12 },
  { clave: 'espina', puntos: -6, peso: 9 },
  { clave: 'paloma', puntos: -3, peso: 6 },
  { clave: 'media', puntos: -3, peso: 7 },
  { clave: 'manzana_podrida', puntos: -4, peso: 7 },
  { clave: 'pan_moho', puntos: -4, peso: 6 },
  { clave: 'cucaracha', puntos: -6, peso: 5 },
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
  private reloj = 0;
  private terminado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private proximo = 0;

  constructor() {
    super('Basura');
  }

  create(): void {
    this.puntos = 0;
    this.terminado = false;
    this.reloj = 0;
    this.fin = DURACION + 1500;
    this.proximo = 1500;
    this.marcador = montarMinijuego(this, 'Buscar en la basura');
    this.combo = new Combo(this);
    aviso(this, '¡Toca lo que sirve!\nEvita cáscara y espina. Aprendí a golpes.');
  }

  private lanzar(): void {
    const t = sortear();
    const img = this.add.image(BOCA.x * E, BOCA.y * E, t.clave).setScale(E * 1.5).setInteractive({ useHandCursor: true }).setDepth(5);
    // Arco: sube y cae hacia un punto al azar de la pantalla.
    const destinoX = Phaser.Math.Between(40, ANCHO - 40);
    const alto = Phaser.Math.Between(50, 90);
    const dur = Phaser.Math.Between(1700, 2600) / ritmo();
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
      const p = t.puntos > 0 ? this.combo.acierto(t.puntos) : t.puntos;
      if (t.puntos <= 0) this.combo.error();
      this.puntos += p;
      this.marcador.puntos(this.puntos);
      flotar(this, p > 0 ? `+${p}` : String(p), img.x / E, img.y / E, p > 0);
      this.tweens.killTweensOf(img);
      if (t.clave === 'paloma') {
        // La paloma se asusta y se va volando.
        img.setTexture('paloma_vuela').setAngle(0);
        this.tweens.add({ targets: img, y: -40 * E, x: img.x + 80 * E, duration: 700, onComplete: () => img.destroy() });
      } else {
        this.tweens.add({ targets: img, scale: 0, duration: 120, onComplete: () => img.destroy() });
      }
      if (t.puntos < 0) this.cameras.main.shake(120, 0.006);
    });
  }

  override update(_t: number, dt: number): void {
    // Tiempo propio de la partida, contado desde create(): no depende de relojes que siguen
    // corriendo entre una escena y otra.
    this.reloj += dt;
    const t = this.reloj;
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
      this.proximo = t + (900 - 480 * Math.min(1, avance)) / ritmo();
    }
  }
}
