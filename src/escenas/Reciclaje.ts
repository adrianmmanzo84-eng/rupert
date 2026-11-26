import Phaser from 'phaser';
import { RECICLABLES, type Tacho } from '../core/minijuegos';
import { COLOR, E, caja, texto } from '../ui/ui';
import { ritmo, type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 40_000;

const TACHOS: { id: Tacho; nombre: string; color: number }[] = [
  { id: 'plastico', nombre: 'Plástico', color: 0xe0b43a },
  { id: 'vidrio', nombre: 'Vidrio', color: 0x3f9a55 },
  { id: 'papel', nombre: 'Papel y cartón', color: 0x3d6fc4 },
  { id: 'metal', nombre: 'Metal', color: 0x8b939c },
];

/** Separar lo que Rupert juntó: cada cosa a su tacho antes de que se acabe su tiempo. */
export class Reciclaje extends Phaser.Scene {
  private puntos = 0;
  private racha = 0;
  private fin = 0;
  private reloj = 0;
  private terminado = false;
  private marcador!: Marcador;
  private actual: { img: Phaser.GameObjects.Image; tacho: Tacho; hasta: number; dura: number } | null = null;
  private barra!: Phaser.GameObjects.Graphics;
  private rachaTexto!: Phaser.GameObjects.Text;
  private separados = 0;

  constructor() {
    super('Reciclaje');
  }

  create(): void {
    this.puntos = 0;
    this.racha = 0;
    this.separados = 0;
    this.terminado = false;
    this.actual = null;
    this.reloj = 0;
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Juntar para reciclar', 0.55);
    TACHOS.forEach((t, i) => {
      const x = 14 + i * 116;
      const g = this.add.graphics();
      caja(g, x, 186, 104, 80, 0x2a1f33, t.color, 0.7);
      this.add.image((x + 52) * E, 250 * E, `tacho_${t.id}`).setOrigin(0.5, 1).setScale(E);
      texto(this, x + 52, 251, t.nombre, { tam: 11, alinear: 'center' }).setOrigin(0.5, 0);
      const zona = this.add.zone(x * E, 186 * E, 104 * E, 80 * E).setOrigin(0).setInteractive({ useHandCursor: true });
      zona.on('pointerdown', () => this.elegir(t.id, x + 52));
    });
    this.barra = this.add.graphics();
    this.rachaTexto = texto(this, 240, 150, '', { tam: 12, color: COLOR.oro }).setOrigin(0.5);
    aviso(this, 'Toca el tacho correcto para cada cosa.\n¡Cada 5 aciertos seguidos, premio extra!');
    this.time.delayedCall(1500, () => this.siguiente());
  }

  private siguiente(): void {
    if (this.terminado) return;
    const claves = Object.keys(RECICLABLES);
    const clave = claves[Math.floor(Math.random() * claves.length)];
    // Cada vez menos tiempo por objeto: de 3 s a 1,3 s.
    const dura = Math.max(1000, 3000 - this.separados * 90) / ritmo();
    const img = this.add.image(240 * E, 95 * E, clave).setScale(E * 2.4);
    this.tweens.add({ targets: img, scale: { from: 0, to: E * 2.4 }, duration: 150 });
    this.actual = { img, tacho: RECICLABLES[clave], hasta: this.reloj + dura, dura };
  }

  private elegir(t: Tacho, x: number): void {
    const a = this.actual;
    if (!a || this.terminado) return;
    this.actual = null;
    if (a.tacho === t) {
      this.racha += 1;
      this.separados += 1;
      const extra = this.racha % 5 === 0 ? 5 : 0;
      this.puntos += 3 + extra;
      flotar(this, extra ? `+${3 + extra} ¡racha!` : '+3', x, 175, true);
      this.tweens.add({ targets: a.img, x: x * E, y: 215 * E, scale: E * 0.6, duration: 160, onComplete: () => a.img.destroy() });
    } else {
      this.fallo(a.img, x);
    }
    this.marcador.puntos(this.puntos);
    this.time.delayedCall(180, () => this.siguiente());
  }

  private fallo(img: Phaser.GameObjects.Image, x: number): void {
    this.racha = 0;
    this.puntos -= 2;
    flotar(this, '-2', x, 175, false);
    this.cameras.main.shake(120, 0.006);
    this.tweens.add({ targets: img, alpha: 0, angle: 90, duration: 200, onComplete: () => img.destroy() });
  }

  override update(_t: number, dt: number): void {
    // Tiempo propio de la partida, contado desde create(): no depende de relojes que siguen
    // corriendo entre una escena y otra.
    this.reloj += dt;
    const t = this.reloj;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - t);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    this.rachaTexto.setText(this.racha >= 2 ? `Racha: ${this.racha}` : '');
    this.barra.clear();
    const a = this.actual;
    if (a) {
      const p = Math.max(0, (a.hasta - t) / a.dura);
      this.barra.fillStyle(0x000000, 0.6).fillRect(200 * E, 130 * E, 80 * E, 5 * E);
      this.barra.fillStyle(p > 0.35 ? 0x8ee07a : 0xff7a6b, 1).fillRect(200 * E, 130 * E, 80 * p * E, 5 * E);
      if (t > a.hasta) {
        this.actual = null;
        this.fallo(a.img, 240);
        this.marcador.puntos(this.puntos);
        this.time.delayedCall(180, () => this.siguiente());
      }
    }
    if (resta <= 0) {
      this.terminado = true;
      this.actual?.img.destroy();
      this.actual = null;
      this.barra.clear();
      terminarMinijuego(this, this.puntos, `Separaste ${this.separados} cosas`);
    }
  }
}
