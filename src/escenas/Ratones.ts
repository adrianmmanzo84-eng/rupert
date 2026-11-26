import Phaser from 'phaser';
import { PREMIO_CARRERA, RIVALES_POR_CARRERA, pisada } from '../core/minijuegos';
import { COLOR, E, caja, texto } from '../ui/ui';
import { type Marcador, aviso, montarMinijuego, terminarMinijuego } from './comun';

const CARRILES = [106, 134, 162, 190];
const SALIDA = 40;
const META = 432;
const RONDAS = RIVALES_POR_CARRERA.length;
const PUESTOS = ['1.º', '2.º', '3.º', '4.º'];
type Pata = 'izq' | 'der';

interface Raton {
  spr: Phaser.GameObjects.Image;
  x: number;
  vel: number;
  llegada: number;
  fot: number;
  dist: number;
}

/**
 * Carrera de ratones de la tubería. No se apuesta nada: el jugador hace correr a su ratón
 * tocando las dos patas alternadas (izquierda, derecha, izquierda...). Repetir la misma pata lo frena.
 */
export class Ratones extends Phaser.Scene {
  private puntos = 0;
  private ronda = 0;
  private ratones: Raton[] = [];
  private corriendo = false;
  private terminado = false;
  private llegados = 0;
  private marcador!: Marcador;
  private rondaTexto!: Phaser.GameObjects.Text;
  private impulso = 0;
  private ultimaPata: Pata | null = null;
  private velocimetro!: Phaser.GameObjects.Graphics;
  private cambioVel = 0;
  private botones: Record<Pata, Phaser.GameObjects.Container> = {} as never;

  constructor() {
    super('Ratones');
  }

  create(): void {
    this.puntos = 0;
    this.ronda = 0;
    this.terminado = false;
    this.corriendo = false;
    this.ratones = [];
    this.marcador = montarMinijuego(this, 'Carrera de ratones', 0.5);
    this.marcador.tiempo(`${RONDAS} carreras`);
    const g = this.add.graphics();
    // Pista de cartón con carriles y línea de llegada a cuadros.
    caja(g, 26, 88, 428, 116, 0x7a5a3a, 0x3a2416, 1);
    g.lineStyle(E, 0x3a2416, 0.8);
    for (let i = 1; i < CARRILES.length; i++) g.lineBetween(26 * E, (CARRILES[i] - 14) * E, 454 * E, (CARRILES[i] - 14) * E);
    for (let y = 90; y < 202; y += 6) {
      const par = ((y - 90) / 6) % 2 === 0;
      g.fillStyle(par ? 0xffffff : 0x1b1424, 1).fillRect(META * E, y * E, 3 * E, 6 * E);
      g.fillStyle(par ? 0x1b1424 : 0xffffff, 1).fillRect((META + 3) * E, y * E, 3 * E, 6 * E);
    }
    g.fillStyle(0xd8433b, 0.25).fillRect(26 * E, (CARRILES[0] - 14) * E, 428 * E, 28 * E);
    this.rondaTexto = texto(this, 240, 72, '', { tam: 13, color: COLOR.oro }).setOrigin(0.5);
    this.velocimetro = this.add.graphics();
    texto(this, 240, 211, 'Velocidad', { tam: 10, color: '#c9b9a6' }).setOrigin(0.5, 0);
    this.botones.izq = this.botonPata(8, 'izq', 'Pata\nizquierda');
    this.botones.der = this.botonPata(362, 'der', 'Pata\nderecha');
    this.input.keyboard?.on('keydown-LEFT', () => this.pisar('izq'));
    this.input.keyboard?.on('keydown-RIGHT', () => this.pisar('der'));
    aviso(this, 'Tu ratón es el de la bufanda roja.\nToca las patas alternadas: izquierda, derecha, izquierda...', 2600);
    this.time.delayedCall(2700, () => this.nuevaRonda());
  }

  /** Botón grande que responde al apoyar el dedo (no al soltarlo), para poder tocar rápido. */
  private botonPata(x: number, pata: Pata, rotulo: string): Phaser.GameObjects.Container {
    const cont = this.add.container(x * E, 210 * E).setDepth(30);
    const g = this.add.graphics();
    caja(g, 0, 0, 110, 54, COLOR.boton);
    cont.add(g);
    cont.add(texto(this, 55, 27, rotulo, { tam: 13, alinear: 'center' }).setOrigin(0.5));
    const zona = this.add.zone(0, 0, 110 * E, 54 * E).setOrigin(0).setInteractive();
    zona.on('pointerdown', () => this.pisar(pata));
    cont.add(zona);
    return cont;
  }

  private nuevaRonda(): void {
    this.ronda += 1;
    this.llegados = 0;
    this.impulso = 0;
    this.ultimaPata = null;
    this.ratones.forEach((r) => r.spr.destroy());
    this.ratones = CARRILES.map((y, i) => ({
      spr: this.add.image(SALIDA * E, (y + 9) * E, `raton${i}_0`).setOrigin(0, 1).setScale(E * 1.7).setDepth(10),
      x: SALIDA,
      vel: 0,
      llegada: 0,
      fot: 0,
      dist: 0,
    }));
    this.rondaTexto.setText(`Carrera ${this.ronda} de ${RONDAS}`);
    const cuenta = texto(this, 240, 146, '3', { tam: 30, color: COLOR.oro }).setOrigin(0.5).setDepth(50);
    ['2', '1', '¡Ya!'].forEach((s, i) => this.time.delayedCall(600 * (i + 1), () => cuenta.setText(s)));
    this.time.delayedCall(2100, () => {
      cuenta.destroy();
      this.corriendo = true;
    });
  }

  private pisar(pata: Pata): void {
    const b = this.botones[pata];
    this.tweens.add({ targets: b, alpha: 0.6, duration: 50, yoyo: true });
    if (!this.corriendo || this.ratones[0]?.llegada) return;
    const repetida = this.ultimaPata === pata;
    this.impulso = pisada(this.impulso, pata, this.ultimaPata);
    this.ultimaPata = pata;
    if (repetida) {
      const yo = this.ratones[0];
      const t = texto(this, yo.x + 20, CARRILES[0] - 22, '¡Tropieza!', { tam: 11, color: COLOR.rojo }).setOrigin(0.5).setDepth(40);
      this.tweens.add({ targets: t, alpha: 0, y: t.y - 10 * E, duration: 500, onComplete: () => t.destroy() });
    }
  }

  private dibujarVelocimetro(): void {
    const v = Math.min(1, this.impulso / 32);
    const m = this.velocimetro;
    m.clear();
    m.fillStyle(0x1b1424, 0.9).fillRect(160 * E, 224 * E, 160 * E, 12 * E);
    m.fillStyle(v > 0.6 ? 0x8ee07a : v > 0.3 ? 0xe0b43a : 0xb13e3e, 1).fillRect(162 * E, 226 * E, 156 * v * E, 8 * E);
  }

  override update(_t: number, dt: number): void {
    this.dibujarVelocimetro();
    if (!this.corriendo || this.terminado) return;
    const s = dt / 1000;
    this.impulso *= Math.pow(0.9, dt / 100);
    this.cambioVel -= dt;
    const cambiar = this.cambioVel <= 0;
    if (cambiar) this.cambioVel = 450;
    const ritmo = RIVALES_POR_CARRERA[this.ronda - 1];
    this.ratones.forEach((r, i) => {
      if (r.llegada) return;
      if (i === 0) r.vel = 8 + this.impulso;
      else if (cambiar) r.vel = Phaser.Math.FloatBetween(ritmo - 7, ritmo + 7);
      const antes = r.x;
      r.x = Math.min(META, r.x + r.vel * s);
      r.spr.setX(r.x * E);
      // Las patas se mueven según lo que avanza: rápido si corre, quietas si se para.
      r.dist += r.x - antes;
      if (r.dist > 5) {
        r.dist = 0;
        r.fot = (r.fot + 1) % 4;
        r.spr.setTexture(`raton${i}_${r.fot}`);
      }
      if (r.x >= META) {
        this.llegados += 1;
        r.llegada = this.llegados;
        texto(this, META + 8, CARRILES[i] - 10, PUESTOS[r.llegada - 1], { tam: 11, color: i === 0 ? COLOR.oro : COLOR.tinta }).setDepth(20).setName('puesto');
      }
    });
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
