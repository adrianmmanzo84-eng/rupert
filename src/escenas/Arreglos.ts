import Phaser from 'phaser';
import { type Arreglo, HERRAMIENTAS, type Herramienta, puntosArreglo, siguienteArreglo } from '../core/changas';
import { COLOR, E, caja, texto } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 45_000;

/** Changas de arreglos: leer qué se rompió y elegir la herramienta justa. */
export class Arreglos extends Phaser.Scene {
  private puntos = 0;
  private hechos = 0;
  private reloj = 0;
  private fin = 0;
  private desde = 0;
  private terminado = false;
  private esperando = true;
  private marcador!: Marcador;
  private actual: Arreglo | null = null;
  private objeto!: Phaser.GameObjects.Image;
  private pedido!: Phaser.GameObjects.Text;

  constructor() {
    super('Arreglos');
  }

  create(): void {
    this.puntos = 0;
    this.hechos = 0;
    this.reloj = 0;
    this.terminado = false;
    this.esperando = true;
    this.actual = null;
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Changas de arreglos', 0.55);

    const g = this.add.graphics();
    caja(g, 60, 44, 360, 30, COLOR.panel);
    this.pedido = texto(this, 240, 59, '', { tam: 13, alinear: 'center', ancho: 340 }).setOrigin(0.5);
    caja(g, 150, 80, 180, 104, 0x3a2b22, COLOR.borde);
    this.objeto = this.add.image(240 * E, 132 * E, 'silla_rota').setVisible(false);

    HERRAMIENTAS.forEach((h, i) => {
      const x = 90 + i * 100;
      const gb = this.add.graphics();
      caja(gb, x - 40, 194, 80, 66, 0x2a1f33, COLOR.borde);
      const img = this.add.image(x * E, 220 * E, `herr_${h}`).setScale(E * 1.1).setInteractive({ useHandCursor: true });
      const zona = this.add.zone((x - 40) * E, 194 * E, 80 * E, 66 * E).setOrigin(0).setInteractive({ useHandCursor: true });
      texto(this, x, 248, NOMBRES[h], { tam: 10 }).setOrigin(0.5, 0);
      const usar = () => {
        this.tweens.add({ targets: img, angle: { from: -20, to: 0 }, duration: 160 });
        this.usar(h);
      };
      img.on('pointerdown', usar);
      zona.on('pointerdown', usar);
    });

    aviso(this, 'Lee qué se rompió y elige\nla herramienta justa.', 1600);
    this.time.delayedCall(1600, () => this.siguiente());
  }

  private siguiente(): void {
    if (this.terminado) return;
    this.actual = siguienteArreglo(this.actual?.objeto ?? null);
    this.pedido.setText(`«${this.actual.pedido}»`).setColor(COLOR.tinta);
    this.objeto.setTexture(`${this.actual.objeto}_rota`).setVisible(true);
    this.objeto.setScale(E * Math.min(1.6, 90 / this.objeto.height));
    this.objeto.setAlpha(0);
    this.tweens.add({ targets: this.objeto, alpha: 1, duration: 150 });
    this.desde = this.reloj;
    this.esperando = false;
  }

  private usar(h: Herramienta): void {
    if (this.terminado || this.esperando || !this.actual) return;
    const bien = h === this.actual.herramienta;
    const p = puntosArreglo(bien, (this.reloj - this.desde) / 1000);
    this.puntos = Math.max(0, this.puntos + p);
    this.marcador.puntos(this.puntos);
    if (!bien) {
      flotar(this, `${p} Con eso no se arregla`, 240, 96, false);
      this.cameras.main.shake(100, 0.005);
      return;
    }
    this.esperando = true;
    this.hechos += 1;
    this.objeto.setTexture(`${this.actual.objeto}_ok`);
    this.tweens.add({ targets: this.objeto, scale: this.objeto.scale * 1.12, duration: 120, yoyo: true });
    this.pedido.setText('¡Quedó como nuevo!').setColor(COLOR.verde);
    flotar(this, `+${p}`, 240, 96, true);
    this.time.delayedCall(700, () => this.siguiente());
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Arreglaste ${this.hechos} cosas`);
    }
  }
}

const NOMBRES: Record<Herramienta, string> = {
  martillo: 'Martillo',
  destornillador: 'Destornillador',
  llave: 'Llave inglesa',
  cinta: 'Cinta aislante',
};
