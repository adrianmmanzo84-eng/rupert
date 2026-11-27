import Phaser from 'phaser';
import {
  ALTO_VANO, ANCHO_VANO, ANCHO_VANO_MUNDO, CAPAS_TALLER, NOMBRE_PIEZA, PIEZAS, type CapaTaller, type Pieza,
  averias, cantidadAverias, colorAuto, puntosAuto,
} from '../core/changas';
import { juego } from '../juego';
import { COLOR, E, caja, texto } from '../ui/ui';
import { brillo, chispas, confeti, humo } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 60_000;
/** Esquina del vano en el mundo. */
const MX = 4;
const MY = 40;
/** Píxeles de pantalla por píxel de la imagen original (las imágenes ya vienen a este tamaño). */
const K = (ANCHO_VANO_MUNDO * E) / ANCHO_VANO;
/** Cuánto se agranda el toque, en px de pantalla, para acertarle a las piezas finas. */
const TOLERANCIA = 8;

/** Nombres cortos para la bandeja de repuestos. */
const CORTO: Record<Pieza, string> = {
  bateria: 'Batería', bujia: 'Bujía', filtro_aire: 'Filtro aire', correa: 'Correa', manguera_principal: 'Manguera',
  manguera_auxiliar: 'Manguerita', tapa_radiador: 'Tapón', cables_encendido: 'Cables', radiador: 'Radiador', bloque_motor: 'Motor',
};

/** Reparar el auto: encontrar las piezas rotas del vano y cambiarlas por el repuesto que corresponde. */
export class TallerAuto extends Phaser.Scene {
  private puntos = 0;
  private autos = 0;
  private color = -1;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private esperando = true;
  private marcador!: Marcador;
  private gastadas = new Set<string>();
  private elegida: CapaTaller | null = null;
  private auto!: Phaser.GameObjects.Container;
  private base!: Phaser.GameObjects.Image;
  private capas = new Map<string, Phaser.GameObjects.Image>();
  private marco!: Phaser.GameObjects.Graphics;
  private estado!: Phaser.GameObjects.Text;
  private combo!: Combo;

  constructor() {
    super('TallerAuto');
  }

  create(): void {
    this.puntos = 0;
    this.autos = 0;
    this.color = -1;
    this.reloj = 0;
    this.terminado = false;
    this.esperando = true;
    this.elegida = null;
    this.capas.clear();
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Reparar el auto', 0.6);
    this.combo = new Combo(this);

    this.base = this.add.image(0, 0, 'taller_base_0').setOrigin(0);
    this.auto = this.add.container(MX * E, MY * E, [this.base]);
    for (const c of CAPAS_TALLER) {
      const img = this.add.image(0, 0, `taller_${c.pieza}_sano`);
      img.setPosition(Math.round(c.x * K) + img.width / 2, Math.round(c.y * K) + img.height / 2);
      this.auto.add(img);
      this.capas.set(c.id, img);
    }
    this.marco = this.add.graphics().setDepth(5);

    // Bandeja de repuestos: 2 columnas × 5 filas.
    const g = this.add.graphics();
    caja(g, 350, 44, 128, 222, COLOR.panel);
    texto(this, 414, 46, 'Repuestos', { tam: 10, color: COLOR.oro }).setOrigin(0.5, 0);
    PIEZAS.forEach((p, i) => {
      const x = 383 + (i % 2) * 62;
      const y = 80 + Math.floor(i / 2) * 38;
      const gb = this.add.graphics();
      caja(gb, x - 29, y - 17, 58, 36, 0x3a2b22, COLOR.borde);
      this.add.image(x * E, (y - 6) * E, `taller_rep_${p}`);
      texto(this, x, y + 5, CORTO[p], { tam: 8, alinear: 'center', ancho: 56 }).setOrigin(0.5, 0);
      this.add.zone((x - 29) * E, (y - 17) * E, 58 * E, 36 * E).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.ponerRepuesto(p));
    });
    this.estado = texto(this, 414, 256, '', { tam: 8, alinear: 'center', ancho: 124 }).setOrigin(0.5);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x < (MX + ANCHO_VANO_MUNDO) * E) this.tocarVano(p.x, p.y);
    });

    aviso(this, 'Toca en el motor la pieza rota\ny luego su repuesto. Casi soy mecánico.', 1800);
    this.time.delayedCall(1800, () => this.nuevoAuto());
  }

  private nuevoAuto(): void {
    if (this.terminado) return;
    this.color = colorAuto(this.color);
    this.base.setTexture(`taller_base_${this.color}`);
    this.gastadas = new Set(averias(cantidadAverias(this.autos, juego.e.etapa)));
    for (const c of CAPAS_TALLER) this.capas.get(c.id)!.setTexture(`taller_${c.pieza}_${this.gastadas.has(c.id) ? 'roto' : 'sano'}`);
    this.elegida = null;
    this.marco.clear();
    this.estado.setText(this.faltan()).setColor(COLOR.tinta);
    this.auto.setX(-720);
    this.tweens.add({
      targets: this.auto, x: MX * E, duration: 350, ease: 'Quad.easeOut',
      onComplete: () => { this.esperando = false; },
    });
  }

  /** ¿Toca ese punto (en coordenadas del vano) algo dibujado de esta pieza, con un poco de margen? */
  private toca(img: Phaser.GameObjects.Image, lx: number, ly: number): boolean {
    const x0 = img.x - img.width / 2;
    const y0 = img.y - img.height / 2;
    const puntos: [number, number][] = [[0, 0], [TOLERANCIA, 0], [-TOLERANCIA, 0], [0, TOLERANCIA], [0, -TOLERANCIA]];
    for (const [dx, dy] of puntos) {
      const a = this.textures.getPixelAlpha(Math.floor(lx + dx - x0), Math.floor(ly + dy - y0), img.texture.key);
      if (a) return true;
    }
    return false;
  }

  /** La pieza tocada: la rota que esté más arriba o, si no hay, la sana que esté más arriba. */
  private pieza(px: number, py: number): CapaTaller | null {
    const lx = px - this.auto.x;
    const ly = py - this.auto.y;
    if (lx < 0 || ly < 0 || lx > ANCHO_VANO * K || ly > ALTO_VANO * K) return null;
    let sana: CapaTaller | null = null;
    for (let i = CAPAS_TALLER.length - 1; i >= 0; i--) {
      const c = CAPAS_TALLER[i]!;
      if (!this.toca(this.capas.get(c.id)!, lx, ly)) continue;
      if (this.gastadas.has(c.id)) return c;
      sana ??= c;
    }
    return sana;
  }

  private faltan(): string {
    const n = this.gastadas.size;
    return n === 1 ? 'Falta 1 pieza' : `Faltan ${n} piezas`;
  }

  private centro(c: CapaTaller): { x: number; y: number } {
    const img = this.capas.get(c.id)!;
    return { x: this.auto.x + img.x, y: this.auto.y + img.y };
  }

  private tocarVano(px: number, py: number): void {
    if (this.terminado || this.esperando) return;
    const c = this.pieza(px, py);
    if (!c) return;
    const ctr = this.centro(c);
    if (!this.gastadas.has(c.id)) {
      this.puntos = Math.max(0, this.puntos - 1);
      this.marcador.puntos(this.puntos);
      this.combo.error();
      flotar(this, '-1 Esa está bien', ctr.x / E, ctr.y / E - 14, false);
      return;
    }
    this.elegida = c;
    const img = this.capas.get(c.id)!;
    this.marco.clear().lineStyle(E, 0xffd25a, 1)
      .strokeRect(ctr.x - img.width / 2 - 3 * E, ctr.y - img.height / 2 - 3 * E, img.width + 6 * E, img.height + 6 * E);
    this.estado.setText(`${NOMBRE_PIEZA[c.pieza]}: elige el repuesto`).setColor(COLOR.oro);
  }

  private ponerRepuesto(p: Pieza): void {
    if (this.terminado || this.esperando) return;
    if (!this.elegida) {
      this.estado.setText('Primero toca la pieza rota en el motor').setColor(COLOR.rojo);
      return;
    }
    if (p !== this.elegida.pieza) {
      this.puntos = Math.max(0, this.puntos - 2);
      this.marcador.puntos(this.puntos);
      this.combo.error();
      flotar(this, '-2 No es ese repuesto', 414, 70, false);
      this.cameras.main.shake(100, 0.004);
      return;
    }
    const c = this.elegida;
    const img = this.capas.get(c.id)!;
    const ctr = this.centro(c);
    img.setTexture(`taller_${c.pieza}_sano`);
    // Chispas de taller al montar la pieza nueva.
    chispas(this, ctr.x, ctr.y, 14);
    brillo(this, ctr.x, ctr.y);
    this.tweens.add({ targets: img, scale: 1.18, duration: 110, yoyo: true });
    this.gastadas.delete(c.id);
    this.elegida = null;
    this.marco.clear();
    if (this.gastadas.size > 0) {
      this.estado.setText(this.faltan()).setColor(COLOR.tinta);
      return;
    }
    this.esperando = true;
    const piezas = cantidadAverias(this.autos, juego.e.etapa);
    const pts = this.combo.acierto(puntosAuto(piezas));
    this.puntos += pts;
    this.autos += 1;
    this.marcador.puntos(this.puntos);
    this.estado.setText('¡Arrancó! Brum brum.').setColor(COLOR.verde);
    flotar(this, `+${pts} ¡Auto listo!`, MX + 170, MY + 30, true);
    confeti(this, (MX + 170) * E, (MY + 60) * E, 24);
    humo(this, (MX + 170) * E, (MY + 205) * E);
    this.cameras.main.shake(300, 0.003);
    this.time.delayedCall(800, () => {
      this.tweens.add({ targets: this.auto, x: 1000, duration: 350, ease: 'Quad.easeIn', onComplete: () => this.nuevoAuto() });
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
