import Phaser from 'phaser';
import {
  ALTO_PISO, CARRILES, PISOS_HITO, SEGUNDOS_GOLPE, SEGUNDOS_HITO, SEGUNDOS_MONEDA, SEGUNDOS_PISO, TIEMPO_INICIAL,
  conTiempo, intervalo, puntosPiso, siguienteTanda, velocidad,
} from '../core/escalada';
import { COLOR, E, texto } from '../ui/ui';
import { brillo, confeti, estallido, onda, polvo, rebote } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, ritmo, terminarMinijuego } from './comun';

/** Fachada: tres carriles de 80 px, con un caño en el centro de cada uno. */
const X0 = 120;
const ANCHO_F = 240;
const CENTROS = [160, 240, 320];
/** Pies de Rupert y alto con que se dibuja. */
const Y_RUPERT = 216;
const ALTO_R = 54;
/** Qué cae por las ventanas (todas cosas que ya andan por el barrio). */
const CAEN = ['flor', 'lata', 'botella', 'media', 'cascara', 'zapato', 'taza', 'cucaracha'];
const HITOS = [
  'Piso 10. El vértigo todavía no me reconoce.',
  'Piso 20. Desde acá se ve mi vida. Es chica.',
  'Piso 30. Ya pasé más pisos de los que pagué.',
  'Piso 40. Creo que estoy escalando un edificio infinito.',
  'Piso 50. Dejé de contar. Es mentira, sigo contando.',
];

interface Caida {
  spr: Phaser.GameObjects.Image;
  tipo: 'objeto' | 'moneda';
}

/**
 * Escalar el edificio (R036): Rupert trepa por tres caños; tocar a la izquierda o a la derecha lo pasa al caño
 * de al lado. Cada piso suma segundos; lo que cae por las ventanas los resta; las monedas los regalan.
 * Se sube cada vez más rápido y no termina hasta que se acaba el tiempo.
 */
export class Escalada extends Phaser.Scene {
  private puntos = 0;
  private pisos = 0;
  private tiempo = TIEMPO_INICIAL;
  private dist = 0;
  private carril = 1;
  private proxima = 1.2;
  private inmune = 0;
  private terminado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private fachada!: Phaser.GameObjects.TileSprite;
  private rupert!: Phaser.GameObjects.Sprite;
  private caen: Caida[] = [];
  private cartelPiso!: Phaser.GameObjects.Text;

  constructor() {
    super('Escalada');
  }

  /** Dibuja un piso de fachada (ladrillos, ventanas, caños y balcón) una sola vez. */
  private texturaFachada(): void {
    if (this.textures.exists('fachada')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const w = ANCHO_F * E;
    const h = ALTO_PISO * E;
    g.fillStyle(0x9a6a50, 1).fillRect(0, 0, w, h);
    let s = 7;
    const azar = (): number => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    for (let fila = 0; fila < 9; fila++) {
      for (let k = -1; k < ANCHO_F / 16 + 1; k++) {
        const x = (k * 16 + (fila % 2 ? 8 : 0)) * E;
        const tono = [0x8d5f47, 0xa5725a, 0x94654c, 0xb07a5f][Math.floor(azar() * 4)];
        g.fillStyle(tono, 1).fillRect(x + E, fila * 7 * E + E, 15 * E, 6 * E);
      }
    }
    // Ventanas, una por carril: marco, vidrio y una luz encendida en el del medio.
    CENTROS.forEach((cx, i) => {
      const x = (cx - X0 - 17) * E;
      g.fillStyle(0x4a3626, 1).fillRect(x - 2 * E, 12 * E, 38 * E, 34 * E);
      g.fillStyle(i === 1 ? 0xf2c96a : 0x26334a, 1).fillRect(x, 14 * E, 34 * E, 30 * E);
      g.fillStyle(0x000000, 0.25).fillRect(x + 16 * E, 14 * E, 2 * E, 30 * E).fillRect(x, 28 * E, 34 * E, 2 * E);
      if (i !== 1) g.fillStyle(0xffffff, 0.1).fillRect(x + 3 * E, 16 * E, 8 * E, 12 * E);
    });
    // Balcón: la línea que marca cada piso.
    g.fillStyle(0x8c8794, 1).fillRect(0, 60 * E, w, 3 * E);
    g.fillStyle(0x6e6a72, 1).fillRect(0, 63 * E, w, 7 * E);
    g.fillStyle(0x000000, 0.3).fillRect(0, 69 * E, w, E);
    // Caños.
    for (const cx of CENTROS) {
      const x = (cx - X0 - 3) * E;
      g.fillStyle(0x6a7078, 1).fillRect(x, 0, 6 * E, h);
      g.fillStyle(0xaab1b9, 1).fillRect(x + E, 0, 2 * E, h);
      g.fillStyle(0x4a5058, 1).fillRect(x - E, 20 * E, 8 * E, 3 * E).fillRect(x - E, 55 * E, 8 * E, 3 * E);
    }
    g.generateTexture('fachada', w, h);
    g.destroy();
  }

  create(): void {
    this.puntos = 0;
    this.pisos = 0;
    this.tiempo = TIEMPO_INICIAL;
    this.dist = 0;
    this.carril = 1;
    this.proxima = 1.4;
    this.inmune = 0;
    this.terminado = false;
    this.caen = [];
    this.marcador = montarMinijuego(this, 'Escalar el edificio', 0.88);
    this.combo = new Combo(this);
    this.texturaFachada();
    this.fachada = this.add.tileSprite(X0 * E, 0, ANCHO_F * E, 270 * E, 'fachada').setOrigin(0).setDepth(1);
    this.fachada.tilePositionY = 40 * E;
    // Sombras a los costados, para que la fachada parezca más profunda.
    const lados = this.add.graphics().setDepth(2);
    lados.fillStyle(0x000000, 0.35).fillRect(X0 * E, 0, 8 * E, 270 * E).fillRect((X0 + ANCHO_F - 8) * E, 0, 8 * E, 270 * E);
    this.cartelPiso = texto(this, 12, 44, 'Piso 0', { tam: 12, color: COLOR.oro }).setDepth(41);

    // Rupert con ropa de trabajo: la tira ya viene al tamaño de pantalla y con el eje en el centro del cuadro.
    if (!this.anims.exists('rupert_escalar')) {
      this.anims.create({ key: 'rupert_escalar', frames: this.anims.generateFrameNumbers('rupert_escalar', {}), frameRate: 8, repeat: -1 });
    }
    this.rupert = this.add.sprite(CENTROS[1] * E, Y_RUPERT * E, 'rupert_escalar', 0).setOrigin(0.5, 1).setDepth(20).play('rupert_escalar');

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.mover(p.x < 240 * E ? -1 : 1));
    this.input.keyboard?.on('keydown-LEFT', () => this.mover(-1));
    this.input.keyboard?.on('keydown-A', () => this.mover(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.mover(1));
    this.input.keyboard?.on('keydown-D', () => this.mover(1));
    aviso(this, 'Toca a la izquierda o a la derecha\npara pasar al caño de al lado.\nEsquiva lo que cae. Cada piso suma segundos.', 2200);
    this.marcador.tiempo(TIEMPO_INICIAL);
  }

  private mover(d: number): void {
    if (this.terminado) return;
    const nuevo = Phaser.Math.Clamp(this.carril + d, 0, CARRILES - 1);
    if (nuevo === this.carril) {
      // Contra el borde: un saltito de «no puedo más para allá».
      this.tweens.add({ targets: this.rupert, angle: d * 6, duration: 70, yoyo: true });
      return;
    }
    this.carril = nuevo;
    this.tweens.killTweensOf(this.rupert);
    this.tweens.add({ targets: this.rupert, x: CENTROS[nuevo] * E, duration: 110, ease: 'Quad.easeOut' });
    rebote(this, this.rupert, 1.1, 90);
  }

  private ganarSegundos(s: number, color = '#9fe8ff'): void {
    this.tiempo = conTiempo(this.tiempo, s);
    const t = texto(this, 92, 22, `${s > 0 ? '+' : ''}${s} s`, { tam: 12, color }).setOrigin(0, 0.5).setDepth(52).setScale(0.5);
    this.tweens.add({ targets: t, scale: 1.2, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 8 * E, delay: 600, duration: 350, onComplete: () => t.destroy() });
  }

  private subirPiso(): void {
    this.pisos += 1;
    this.cartelPiso.setText(`Piso ${this.pisos}`);
    rebote(this, this.cartelPiso, 1.3, 120);
    const pts = this.combo.acierto(puntosPiso(this.pisos));
    this.puntos += pts;
    this.marcador.puntos(this.puntos);
    this.ganarSegundos(SEGUNDOS_PISO);
    const x = this.rupert.x / E;
    flotar(this, `+${pts}`, x, Y_RUPERT - ALTO_R - 8, true, false);
    if (this.pisos % PISOS_HITO === 0) {
      this.ganarSegundos(SEGUNDOS_HITO, '#ffe27a');
      confeti(this, 240 * E, 90 * E, 30);
      const frase = HITOS[Math.min(HITOS.length - 1, this.pisos / PISOS_HITO - 1)];
      const t = texto(this, 240, 120, frase, { tam: 14, color: COLOR.oro, alinear: 'center', ancho: 220 }).setOrigin(0.5).setDepth(58).setScale(0.5).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, y: t.y - 12 * E, delay: 1500, duration: 400, onComplete: () => t.destroy() });
    }
  }

  private soltar(): void {
    const tanda = siguienteTanda(this.pisos);
    for (const c of tanda) {
      const nombre = c.tipo === 'moneda' ? 'moneda' : CAEN[Math.floor(Math.random() * CAEN.length)];
      const spr = this.add.image(CENTROS[c.carril] * E, -16 * E, nombre).setDepth(15);
      spr.setScale((c.tipo === 'moneda' ? 18 : 22) * E / Math.max(spr.width, spr.height));
      this.caen.push({ spr, tipo: c.tipo });
    }
    this.proxima = intervalo(this.pisos);
  }

  private golpe(c: Caida): void {
    this.ganarSegundos(-SEGUNDOS_GOLPE, '#ff6a5a');
    this.inmune = 1.3;
    this.combo.error();
    const { x, y } = c.spr;
    polvo(this, x, y);
    estallido(this, x, y, { textura: 'fx_px', colores: [0xffffff, 0xff6a5a], cantidad: 10, velocidad: [40, 120], vida: 420 });
    this.cameras.main.shake(180, 0.007);
    this.tweens.add({ targets: this.rupert, alpha: 0.25, duration: 90, yoyo: true, repeat: 6, onComplete: () => this.rupert.setAlpha(1) });
    const frases = ['¡Ay!', '¡Mi cabeza!', '¡Era mía esa media!', '¡Me cayó la vida encima!'];
    flotar(this, frases[Math.floor(Math.random() * frases.length)], this.rupert.x / E, Y_RUPERT - ALTO_R - 8, false, false);
    c.spr.destroy();
  }

  private moneda(c: Caida): void {
    this.ganarSegundos(SEGUNDOS_MONEDA, '#ffe27a');
    this.puntos += 3;
    this.marcador.puntos(this.puntos);
    brillo(this, c.spr.x, c.spr.y);
    onda(this, c.spr.x, c.spr.y, 0xffe27a, 24, 300);
    c.spr.destroy();
  }

  override update(_t: number, dt: number): void {
    if (this.terminado) return;
    const s = dt / 1000;
    this.tiempo -= s;
    this.marcador.tiempo(Math.max(0, Math.ceil(this.tiempo)));
    if (this.tiempo <= 0) {
      this.terminado = true;
      this.rupert.setAlpha(1);
      terminarMinijuego(this, this.puntos, this.pisos === 1 ? 'Subiste 1 piso' : `Subiste ${this.pisos} pisos`);
      return;
    }
    this.inmune = Math.max(0, this.inmune - s);
    const v = velocidad(this.pisos, ritmo());
    this.fachada.tilePositionY -= v * E * s;
    this.rupert.anims.timeScale = Math.max(0.7, v / 60);
    this.dist += v * s;
    if (Math.floor(this.dist / ALTO_PISO) > this.pisos) this.subirPiso();
    this.proxima -= s;
    if (this.proxima <= 0) this.soltar();
    const rx = this.rupert.x / E;
    for (let i = this.caen.length - 1; i >= 0; i--) {
      const c = this.caen[i];
      const vy = c.tipo === 'moneda' ? v * 0.9 + 30 : v + 70;
      c.spr.y += vy * s * E;
      c.spr.angle += (c.tipo === 'moneda' ? 0 : 160) * s;
      const y = c.spr.y / E;
      const cerca = Math.abs(c.spr.x / E - rx) < 18 && y > Y_RUPERT - ALTO_R && y < Y_RUPERT - 4;
      if (cerca && c.tipo === 'moneda') {
        this.moneda(c);
        this.caen.splice(i, 1);
      } else if (cerca && this.inmune <= 0) {
        this.golpe(c);
        this.caen.splice(i, 1);
      } else if (y > 290) {
        c.spr.destroy();
        this.caen.splice(i, 1);
      }
    }
  }
}
