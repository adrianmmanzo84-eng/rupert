import Phaser from 'phaser';
import { multiplicador, pagarMinijuego } from '../core/estado';
import { guardarPartida, juego } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, caja, texto } from '../ui/ui';

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
/** Boca del contenedor en el mundo 480x270. */
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
  private marcador!: Phaser.GameObjects.Text;
  private reloj!: Phaser.GameObjects.Text;
  private proximo = 0;

  constructor() {
    super('Basura');
  }

  create(): void {
    this.puntos = 0;
    this.terminado = false;
    this.fin = this.time.now + DURACION + 1500;
    this.proximo = this.time.now + 1500;
    this.add.image(0, 0, juego.e.etapa >= 1 ? 'callejon_e1' : 'callejon_e0').setOrigin(0).setScale(E);
    this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, 0.45).setOrigin(0);
    const g = this.add.graphics();
    caja(g, 4, 4, 150, 34, COLOR.panel);
    this.marcador = texto(this, 12, 6, 'Puntos: 0', { tam: 14, color: COLOR.oro });
    this.reloj = texto(this, 12, 20, '', { tam: 11 });
    texto(this, ANCHO / 2, 140, '¡Toca lo que sirve!\nEvita la cáscara y la espina.', { tam: 16, alinear: 'center' })
      .setOrigin(0.5)
      .setDepth(10)
      .setData('aviso', true);
    this.time.delayedCall(1500, () => this.children.list.filter((c) => c.getData('aviso')).forEach((c) => c.destroy()));
    texto(this, ANCHO - 6, 6, `Rendimiento de Rupert x${multiplicador(juego.e).toFixed(2)}`, { tam: 10, color: '#c9b9a6' }).setOrigin(1, 0);
  }

  private lanzar(): void {
    const t = sortear();
    const img = this.add.image(BOCA.x * E, BOCA.y * E, t.clave).setScale(E * 1.5).setInteractive({ useHandCursor: true }).setDepth(5);
    // Arco: sube y cae hacia un punto al azar de la pantalla.
    const destinoX = Phaser.Math.Between(40, ANCHO - 40);
    const alto = Phaser.Math.Between(30, 70);
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
      this.marcador.setText(`Puntos: ${this.puntos}`);
      const s = t.puntos > 0 ? `+${t.puntos}` : String(t.puntos);
      const f = texto(this, img.x / E, img.y / E, s, { tam: 14, color: t.puntos > 0 ? COLOR.verde : COLOR.rojo }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: f, y: f.y - 20 * E, alpha: 0, duration: 700, onComplete: () => f.destroy() });
      this.tweens.killTweensOf(img);
      this.tweens.add({ targets: img, scale: 0, duration: 120, onComplete: () => img.destroy() });
      if (t.puntos < 0) this.cameras.main.shake(120, 0.006);
    });
  }

  private terminar(): void {
    this.terminado = true;
    const pago = pagarMinijuego(juego.e, this.puntos);
    guardarPartida();
    const g = this.add.graphics().setDepth(30);
    caja(g, 120, 70, 240, 120, COLOR.panel);
    texto(this, 240, 78, '¡Se acabó la búsqueda!', { tam: 16, color: COLOR.oro }).setOrigin(0.5, 0).setDepth(31);
    texto(this, 240, 102, `Puntos: ${this.puntos}\nRendimiento x${multiplicador(juego.e).toFixed(2)}\nGanaste ${pago} monedas`, { tam: 12, alinear: 'center' })
      .setOrigin(0.5, 0)
      .setDepth(31);
    boton(this, 195, 160, 90, 22, 'Volver', () => this.scene.start('Callejon')).cont.setDepth(32);
  }

  override update(t: number): void {
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - t);
    this.reloj.setText(`Tiempo: ${Math.ceil(Math.min(resta, DURACION) / 1000)} s`);
    if (resta <= 0) {
      this.terminar();
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
