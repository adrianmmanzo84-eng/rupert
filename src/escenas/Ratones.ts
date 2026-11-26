import Phaser from 'phaser';
import { PREMIO_CARRERA } from '../core/minijuegos';
import { COLOR, E, boton, caja, texto } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const CARRILES = [104, 132, 160, 188];
const SALIDA = 44;
const META = 436;
const RONDAS = 3;
const PUESTOS = ['1.º', '2.º', '3.º', '4.º'];

interface Raton {
  spr: Phaser.GameObjects.Image;
  x: number;
  vel: number;
  impulso: number;
  llegada: number;
  tex: number;
}

/**
 * Carrera de ratones de la tubería. No se apuesta nada: el jugador anima a su ratón tocando
 * cuando el cursor pasa por la zona verde, y gana puntos según el puesto.
 */
export class Ratones extends Phaser.Scene {
  private puntos = 0;
  private ronda = 0;
  private ratones: Raton[] = [];
  private corriendo = false;
  private terminado = false;
  private llegados = 0;
  private marcador!: Marcador;
  private medidor!: Phaser.GameObjects.Graphics;
  private cursor = 0;
  private rondaTexto!: Phaser.GameObjects.Text;
  private paso = 0;
  private cambioVel = 0;

  constructor() {
    super('Ratones');
  }

  create(): void {
    this.puntos = 0;
    this.ronda = 0;
    this.terminado = false;
    this.marcador = montarMinijuego(this, 'Carrera de ratones', 0.5);
    this.marcador.tiempo(`${RONDAS} carreras`);
    const g = this.add.graphics();
    // Pista de cartón con carriles y línea de llegada a cuadros.
    caja(g, 30, 88, 420, 116, 0x7a5a3a, 0x3a2416, 1);
    g.lineStyle(E, 0x3a2416, 0.8);
    for (let i = 1; i < CARRILES.length; i++) g.lineBetween(30 * E, (CARRILES[i] - 14) * E, 450 * E, (CARRILES[i] - 14) * E);
    for (let y = 90; y < 202; y += 6) {
      g.fillStyle(((y - 90) / 6) % 2 ? 0xffffff : 0x1b1424, 1).fillRect(META * E, y * E, 3 * E, 6 * E);
      g.fillStyle(((y - 90) / 6) % 2 ? 0x1b1424 : 0xffffff, 1).fillRect((META + 3) * E, y * E, 3 * E, 6 * E);
    }
    this.rondaTexto = texto(this, 240, 70, '', { tam: 13, color: COLOR.oro }).setOrigin(0.5);
    this.medidor = this.add.graphics();
    const b = boton(this, 360, 214, 104, 40, '¡Corre!', () => this.animar(), 18);
    b.cont.setDepth(30);
    // También vale tocar cualquier parte de la pantalla.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y / E > 210) return;
      this.animar();
    });
    aviso(this, 'Tu ratón es el de la bufanda roja.\nToca cuando el cursor esté en lo verde.', 2200);
    this.time.delayedCall(2300, () => this.nuevaRonda());
  }

  private nuevaRonda(): void {
    this.ronda += 1;
    this.llegados = 0;
    this.ratones.forEach((r) => r.spr.destroy());
    this.ratones = CARRILES.map((y, i) => ({
      spr: this.add.image(SALIDA * E, y * E, `raton${i}_0`).setOrigin(0, 1).setScale(E * 2.4).setDepth(10),
      x: SALIDA,
      vel: 0,
      impulso: 0,
      llegada: 0,
      tex: 0,
    }));
    this.rondaTexto.setText(`Carrera ${this.ronda} de ${RONDAS}`);
    const cuenta = texto(this, 240, 145, '3', { tam: 30, color: COLOR.oro }).setOrigin(0.5).setDepth(50);
    ['2', '1', '¡Ya!'].forEach((s, i) => this.time.delayedCall(600 * (i + 1), () => cuenta.setText(s)));
    this.time.delayedCall(2100, () => {
      cuenta.destroy();
      this.corriendo = true;
    });
  }

  /** Posición del cursor del medidor: va y viene entre 0 y 1. */
  private posCursor(): number {
    const c = this.cursor % 2;
    return c < 1 ? c : 2 - c;
  }

  private animar(): void {
    if (!this.corriendo) return;
    const yo = this.ratones[0];
    if (yo.llegada) return;
    const d = Math.abs(this.posCursor() - 0.5);
    if (d < 0.1) {
      yo.impulso += 7;
      flotar(this, '¡Bien!', yo.x + 10, CARRILES[0] - 18, true);
    } else if (d < 0.22) {
      yo.impulso += 3;
    } else {
      yo.impulso = Math.max(0, yo.impulso - 5);
      flotar(this, 'Tropieza', yo.x + 10, CARRILES[0] - 18, false);
    }
  }

  private dibujarMedidor(): void {
    const m = this.medidor;
    const x = 40;
    const y = 220;
    const w = 300;
    m.clear();
    m.fillStyle(0x1b1424, 0.9).fillRect((x - 2) * E, (y - 2) * E, (w + 4) * E, 16 * E);
    m.fillStyle(0xb13e3e, 1).fillRect(x * E, y * E, w * E, 12 * E);
    m.fillStyle(0xe0b43a, 1).fillRect((x + w * 0.28) * E, y * E, w * 0.44 * E, 12 * E);
    m.fillStyle(0x4fb35f, 1).fillRect((x + w * 0.4) * E, y * E, w * 0.2 * E, 12 * E);
    m.fillStyle(0xffffff, 1).fillRect((x + w * this.posCursor() - 2) * E, (y - 3) * E, 4 * E, 18 * E);
  }

  override update(t: number, dt: number): void {
    this.cursor += dt / 650;
    this.dibujarMedidor();
    if (!this.corriendo || this.terminado) return;
    const s = dt / 1000;
    this.cambioVel -= dt;
    const cambiar = this.cambioVel <= 0;
    if (cambiar) this.cambioVel = 500;
    this.ratones.forEach((r, i) => {
      if (r.llegada) return;
      if (i === 0) {
        r.impulso *= Math.pow(0.92, dt / 100);
        r.vel = 12 + r.impulso;
      } else if (cambiar) {
        // Los rivales corren a ritmo irregular, unos 24 px/s de media.
        r.vel = Phaser.Math.FloatBetween(16, 32);
      }
      r.x = Math.min(META, r.x + r.vel * s);
      r.spr.setX(r.x * E);
      if (r.x >= META) {
        this.llegados += 1;
        r.llegada = this.llegados;
        texto(this, META + 8, CARRILES[i] - 12, PUESTOS[r.llegada - 1], { tam: 11, color: i === 0 ? COLOR.oro : COLOR.tinta }).setDepth(20).setName('puesto');
      }
    });
    // Patitas: alterna el dibujo según lo que avanza.
    this.paso += dt;
    if (this.paso > 110) {
      this.paso = 0;
      this.ratones.forEach((r, i) => {
        if (r.llegada) return;
        r.tex = 1 - r.tex;
        r.spr.setTexture(`raton${i}_${r.tex}`);
      });
    }
    const yo = this.ratones[0];
    if (yo.llegada && this.corriendo) {
      this.corriendo = false;
      const premio = PREMIO_CARRERA[yo.llegada - 1];
      this.puntos += premio;
      this.marcador.puntos(this.puntos);
      this.rondaTexto.setText(`Tu ratón llegó ${PUESTOS[yo.llegada - 1]}: +${premio}`);
      this.time.delayedCall(1800, () => {
        this.children.list.filter((c) => c.name === 'puesto').forEach((c) => c.destroy());
        if (this.ronda < RONDAS) this.nuevaRonda();
        else {
          this.terminado = true;
          terminarMinijuego(this, this.puntos, `${RONDAS} carreras corridas`);
        }
      });
    }
  }
}
