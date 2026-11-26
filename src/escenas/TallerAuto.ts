import Phaser from 'phaser';
import { LUGAR_PIEZA, NOMBRE_PIEZA, TAM_PIEZA, PIEZAS, type Pieza, averias, cantidadAverias, puntosAuto } from '../core/changas';
import { juego } from '../juego';
import { COLOR, E, caja, texto } from '../ui/ui';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 60_000;
/** Esquina del dibujo del motor en el mundo. */
const MX = 8;
const MY = 40;

/** Reparar el auto: encontrar las piezas gastadas en el motor y cambiarlas por la nueva que corresponde. */
export class TallerAuto extends Phaser.Scene {
  private puntos = 0;
  private autos = 0;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private esperando = true;
  private marcador!: Marcador;
  private gastadas = new Set<Pieza>();
  private elegida: Pieza | null = null;
  private piezas = new Map<Pieza, Phaser.GameObjects.Image>();
  private marco!: Phaser.GameObjects.Graphics;
  private estado!: Phaser.GameObjects.Text;
  private motor!: Phaser.GameObjects.Image;
  private combo!: Combo;

  constructor() {
    super('TallerAuto');
  }

  create(): void {
    this.puntos = 0;
    this.autos = 0;
    this.reloj = 0;
    this.terminado = false;
    this.esperando = true;
    this.elegida = null;
    this.piezas.clear();
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Reparar el auto', 0.6);
    this.combo = new Combo(this);

    this.motor = this.add.image(MX * E, MY * E, 'motor').setOrigin(0).setScale(E);
    for (const p of PIEZAS) {
      const l = LUGAR_PIEZA[p];
      const img = this.add.image((MX + l.x) * E, (MY + l.y) * E, `pieza_${p}_nueva`).setInteractive({ useHandCursor: true });
      img.setScale((E * TAM_PIEZA[p]) / Math.max(img.width, img.height));
      img.setData('escala', img.scale);
      img.on('pointerdown', () => this.tocarMotor(p));
      this.piezas.set(p, img);
    }
    this.marco = this.add.graphics().setDepth(5);

    const g = this.add.graphics();
    caja(g, 316, 44, 160, 222, COLOR.panel);
    texto(this, 396, 47, 'Repuestos', { tam: 12, color: COLOR.oro }).setOrigin(0.5, 0);
    PIEZAS.forEach((p, i) => {
      const x = 356 + (i % 2) * 80;
      const y = 86 + Math.floor(i / 2) * 58;
      const gb = this.add.graphics();
      caja(gb, x - 36, y - 24, 72, 52, 0x3a2b22, COLOR.borde);
      this.add.image(x * E, (y - 4) * E, `pieza_${p}_nueva`).setScale(E);
      texto(this, x, y + 13, NOMBRE_PIEZA[p], { tam: 8, alinear: 'center', ancho: 70 }).setOrigin(0.5, 0);
      this.add.zone((x - 36) * E, (y - 24) * E, 72 * E, 52 * E).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.ponerRepuesto(p));
    });
    this.estado = texto(this, 396, 250, '', { tam: 10, alinear: 'center', ancho: 150 }).setOrigin(0.5);

    aviso(this, 'Toca en el motor la pieza gastada\ny después su repuesto nuevo.', 1800);
    this.time.delayedCall(1800, () => this.nuevoAuto());
  }

  private nuevoAuto(): void {
    if (this.terminado) return;
    this.gastadas = new Set(averias(cantidadAverias(this.autos, juego.e.etapa)));
    for (const p of PIEZAS) this.piezas.get(p)!.setTexture(`pieza_${p}_${this.gastadas.has(p) ? 'gastada' : 'nueva'}`);
    this.elegida = null;
    this.marco.clear();
    this.estado.setText(`Faltan ${this.gastadas.size} piezas`).setColor(COLOR.tinta);
    this.motor.setX(-320 * E);
    for (const img of this.piezas.values()) img.setAlpha(0);
    this.tweens.add({
      targets: this.motor, x: MX * E, duration: 350, ease: 'Quad.easeOut',
      onComplete: () => {
        for (const img of this.piezas.values()) img.setAlpha(1);
        this.esperando = false;
      },
    });
  }

  private tocarMotor(p: Pieza): void {
    if (this.terminado || this.esperando) return;
    const l = LUGAR_PIEZA[p];
    if (!this.gastadas.has(p)) {
      this.puntos = Math.max(0, this.puntos - 1);
      this.marcador.puntos(this.puntos);
      this.combo.error();
      flotar(this, '-1 Esa está bien', MX + l.x, MY + l.y - 20, false);
      return;
    }
    this.elegida = p;
    const img = this.piezas.get(p)!;
    this.marco.clear().lineStyle(E, 0xffd25a, 1)
      .strokeRect(img.x - img.displayWidth / 2 - 3 * E, img.y - img.displayHeight / 2 - 3 * E, img.displayWidth + 6 * E, img.displayHeight + 6 * E);
    this.estado.setText(`${NOMBRE_PIEZA[p]}: elige el repuesto`).setColor(COLOR.oro);
  }

  private ponerRepuesto(p: Pieza): void {
    if (this.terminado || this.esperando) return;
    if (!this.elegida) {
      this.estado.setText('Primero toca la pieza gastada en el motor').setColor(COLOR.rojo);
      return;
    }
    if (p !== this.elegida) {
      this.puntos = Math.max(0, this.puntos - 2);
      this.marcador.puntos(this.puntos);
      this.combo.error();
      flotar(this, '-2 No es ese repuesto', 396, 70, false);
      this.cameras.main.shake(100, 0.004);
      return;
    }
    const img = this.piezas.get(p)!;
    img.setTexture(`pieza_${p}_nueva`);
    this.tweens.add({ targets: img, scale: (img.getData('escala') as number) * 1.25, duration: 110, yoyo: true });
    this.gastadas.delete(p);
    this.elegida = null;
    this.marco.clear();
    if (this.gastadas.size > 0) {
      this.estado.setText(`Faltan ${this.gastadas.size} piezas`).setColor(COLOR.tinta);
      return;
    }
    this.esperando = true;
    const piezas = cantidadAverias(this.autos, juego.e.etapa);
    const pts = this.combo.acierto(puntosAuto(piezas));
    this.puntos += pts;
    this.autos += 1;
    this.marcador.puntos(this.puntos);
    this.estado.setText('¡Arrancó! Brum brum.').setColor(COLOR.verde);
    flotar(this, `+${pts} ¡Auto listo!`, MX + 150, MY + 30, true);
    this.cameras.main.shake(300, 0.003);
    this.time.delayedCall(800, () => {
      for (const img2 of this.piezas.values()) img2.setAlpha(0);
      this.tweens.add({ targets: this.motor, x: 520 * E, duration: 350, ease: 'Quad.easeIn', onComplete: () => this.nuevoAuto() });
    });
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Arreglaste ${this.autos} autos`);
    }
  }
}
