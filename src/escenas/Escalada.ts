import Phaser from 'phaser';
import {
  ALTO_PISO, CARRILES, META_PISOS, PISOS_HITO, SEGUNDOS_GOLPE, SEGUNDOS_HITO, SEGUNDOS_MONEDA, SEGUNDOS_PISO, TIEMPO_INICIAL,
  type TipoCaida, conTiempo, intervalo, premioLlegada, puntosPiso, siguienteTanda, velocidad,
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
const CAEN = ['flor', 'lata', 'botella', 'media', 'cascara', 'zapato', 'taza', 'cucaracha', 'osito', 'toalla', 'caja'];
const MUEBLES = ['heladera', 'tele', 'lampara'];
const HITOS = [
  'Piso 5. El vértigo todavía no me reconoce.',
  'Piso 10. Desde acá se ve mi vida. Es chica.',
  'Piso 15. Ya casi llego. Ya casi me arrepiento.',
];
/** Cuánto pesa cada peligro: velocidad extra de caída, tamaño con que se dibuja (alto, px del mundo) y radio de choque. */
const PELIGRO: Record<TipoCaida, { vy: number; tam: number; radio: number }> = {
  objeto: { vy: 70, tam: 22, radio: 18 },
  maceta: { vy: 125, tam: 26, radio: 21 },
  mueble: { vy: 150, tam: 40, radio: 25 },
  paloma: { vy: 55, tam: 24, radio: 16 },
  moneda: { vy: 0, tam: 18, radio: 18 },
};
/** Aviso antes de que caigan las cosas pesadas, en milisegundos. */
const AVISO_MS = 650;

interface Caida {
  spr: Phaser.GameObjects.Image;
  tipo: TipoCaida;
  /** Solo la paloma: centro de su zigzag y fase. */
  base?: number;
  fase?: number;
}

/**
 * Escalar el edificio (R036, R038): Rupert tiene 30 segundos para trepar por tres caños hasta su dpto, 20 pisos más
 * arriba. Tocar a la izquierda o a la derecha lo pasa al caño de al lado. Lo que cae por las ventanas (objetos,
 * macetas, palomas y hasta muebles) resta segundos; las monedas los devuelven. Llegar antes de que se acabe el tiempo
 * da premio, y cada segundo que sobra suma.
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
  private dpto!: Phaser.GameObjects.Image;

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

  /** Piso del dpto de Rupert: pared clara, puerta con cartel, ventanas con flores y felpudo. Es un dibujo provisorio. */
  private texturaDpto(): void {
    for (const abierta of [false, true]) {
      const clave = abierta ? 'dpto_abierto' : 'dpto';
      if (this.textures.exists(clave)) continue;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const w = ANCHO_F * E;
      const h = ALTO_PISO * E;
      g.fillStyle(0xc9a67f, 1).fillRect(0, 0, w, h);
      for (let k = 0; k < 9; k++) g.fillStyle(0x000000, 0.06).fillRect(0, (k * 7 + 6) * E, w, E);
      // Ventanas de los lados, con una maceta en el alféizar.
      for (const cx of [CENTROS[0], CENTROS[2]]) {
        const x = (cx - X0 - 17) * E;
        g.fillStyle(0x4a3626, 1).fillRect(x - 2 * E, 12 * E, 38 * E, 34 * E);
        g.fillStyle(0xf2c96a, 1).fillRect(x, 14 * E, 34 * E, 30 * E);
        g.fillStyle(0x000000, 0.2).fillRect(x + 16 * E, 14 * E, 2 * E, 30 * E);
        g.fillStyle(0xb5543a, 1).fillRect(x + 6 * E, 42 * E, 22 * E, 8 * E);
        g.fillStyle(0x4f9a4a, 1).fillRect(x + 8 * E, 36 * E, 18 * E, 6 * E);
        g.fillStyle(0xe0508a, 1).fillRect(x + 10 * E, 34 * E, 4 * E, 4 * E).fillRect(x + 19 * E, 33 * E, 4 * E, 4 * E);
      }
      // Puerta.
      const px = (CENTROS[1] - X0 - 16) * E;
      g.fillStyle(0x3a2a20, 1).fillRect(px - 3 * E, 8 * E, 38 * E, 55 * E);
      if (abierta) {
        g.fillStyle(0xffe6a8, 1).fillRect(px, 11 * E, 32 * E, 52 * E);
        g.fillStyle(0xe0b060, 1).fillRect(px + 4 * E, 16 * E, 24 * E, 47 * E);
        g.fillStyle(0x6a4a34, 1).fillRect(px + 26 * E, 11 * E, 6 * E, 52 * E);
      } else {
        g.fillStyle(0x7a4a2e, 1).fillRect(px, 11 * E, 32 * E, 52 * E);
        g.fillStyle(0x5a3620, 1).fillRect(px + 4 * E, 16 * E, 10 * E, 18 * E).fillRect(px + 18 * E, 16 * E, 10 * E, 18 * E);
        g.fillStyle(0xe6c15a, 1).fillRect(px + 25 * E, 38 * E, 3 * E, 3 * E);
      }
      // Felpudo y balcón.
      g.fillStyle(0x8a3a3a, 1).fillRect(px + 2 * E, 58 * E, 28 * E, 4 * E);
      g.fillStyle(0x8c8794, 1).fillRect(0, 60 * E, w, 3 * E);
      g.fillStyle(0x6e6a72, 1).fillRect(0, 63 * E, w, 7 * E);
      g.fillStyle(0x000000, 0.3).fillRect(0, 69 * E, w, E);
      g.generateTexture(clave, w, h);
      g.destroy();
    }
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
    this.texturaDpto();
    this.fachada = this.add.tileSprite(X0 * E, 0, ANCHO_F * E, 270 * E, 'fachada').setOrigin(0).setDepth(1);
    this.fachada.tilePositionY = 40 * E;
    // Sombras a los costados, para que la fachada parezca más profunda.
    const lados = this.add.graphics().setDepth(2);
    lados.fillStyle(0x000000, 0.35).fillRect(X0 * E, 0, 8 * E, 270 * E).fillRect((X0 + ANCHO_F - 8) * E, 0, 8 * E, 270 * E);
    this.dpto = this.add.image(X0 * E, -200 * E, 'dpto').setOrigin(0, 1).setDepth(4);
    this.cartelPiso = texto(this, 12, 44, `Piso 0 de ${META_PISOS}`, { tam: 12, color: COLOR.oro }).setDepth(41);

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
    aviso(this, `30 segundos para llegar al dpto, ${META_PISOS} pisos más arriba.\nToca a un lado para cambiar de caño.\nEsquiva lo que cae. ¡Cada golpe cuesta segundos!`, 2200);
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
    this.cartelPiso.setText(`Piso ${this.pisos} de ${META_PISOS}`);
    rebote(this, this.cartelPiso, 1.3, 120);
    const pts = this.combo.acierto(puntosPiso(this.pisos));
    this.puntos += pts;
    this.marcador.puntos(this.puntos);
    this.ganarSegundos(SEGUNDOS_PISO);
    const x = this.rupert.x / E;
    flotar(this, `+${pts}`, x, Y_RUPERT - ALTO_R - 8, true, false);
    if (this.pisos % PISOS_HITO === 0 && this.pisos < META_PISOS) {
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
      if (c.tipo === 'maceta' || c.tipo === 'mueble') {
        // Las cosas pesadas avisan: aparece un «!» arriba del caño antes de que caigan.
        const x = CENTROS[c.carril] * E;
        const a = texto(this, CENTROS[c.carril], 30, '!', { tam: 20, color: '#ff6a5a' }).setOrigin(0.5).setDepth(45);
        this.tweens.add({ targets: a, alpha: 0.2, duration: 110, yoyo: true, repeat: 2 });
        this.time.delayedCall(AVISO_MS, () => {
          a.destroy();
          if (!this.terminado) this.crearCaida(c.tipo, x, c.carril);
        });
      } else {
        this.crearCaida(c.tipo, CENTROS[c.carril] * E, c.carril);
      }
    }
    this.proxima = intervalo(this.pisos);
  }

  private crearCaida(tipo: TipoCaida, x: number, carril: number): void {
    const elegir = (l: string[]): string => l[Math.floor(Math.random() * l.length)];
    const nombre = tipo === 'moneda' ? 'moneda' : tipo === 'maceta' ? 'planta' : tipo === 'mueble' ? elegir(MUEBLES) : tipo === 'paloma' ? 'paloma_vuela' : elegir(CAEN);
    const spr = this.add.image(x, -16 * E, nombre).setDepth(15);
    spr.setScale((PELIGRO[tipo].tam * E) / spr.height);
    const c: Caida = { spr, tipo };
    if (tipo === 'paloma') {
      c.base = CENTROS[carril];
      c.fase = Math.random() * Math.PI * 2;
    }
    this.caen.push(c);
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

  /** Llega al dpto: va a la puerta, la abre, entra y suma el premio por los segundos que sobran. */
  private llegar(): void {
    this.terminado = true;
    this.tiempo = Math.max(0, this.tiempo);
    const sobran = Math.floor(this.tiempo);
    this.rupert.anims.pause();
    for (const c of this.caen) c.spr.destroy();
    this.caen = [];
    this.tweens.killTweensOf(this.rupert);
    this.rupert.setAlpha(1);
    this.tweens.add({
      targets: this.rupert, x: CENTROS[1] * E, duration: 260, ease: 'Quad.easeOut',
      onComplete: () => {
        this.dpto.setTexture('dpto_abierto');
        brillo(this, CENTROS[1] * E, (Y_RUPERT - 24) * E);
        this.tweens.add({ targets: this.rupert, alpha: 0, scale: 0.8, y: this.rupert.y - 4 * E, duration: 420, delay: 150 });
      },
    });
    const premio = premioLlegada(this.tiempo);
    this.puntos += premio;
    this.marcador.puntos(this.puntos);
    confeti(this, 240 * E, 100 * E, 40);
    const t = texto(this, 240, 110, '¡Llegué al dpto!', { tam: 18, color: COLOR.oro }).setOrigin(0.5).setDepth(58).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    flotar(this, `+${premio} Llegada`, 240, 140, true);
    this.time.delayedCall(1700, () => terminarMinijuego(this, this.puntos, `¡Llegaste al dpto con ${sobran} s de sobra!`));
  }

  override update(_t: number, dt: number): void {
    if (this.terminado) return;
    const s = dt / 1000;
    this.tiempo -= s;
    this.marcador.tiempo(Math.max(0, Math.ceil(this.tiempo)));
    if (this.tiempo <= 0) {
      this.terminado = true;
      this.rupert.setAlpha(1);
      terminarMinijuego(this, this.puntos, `Subiste ${this.pisos} de ${META_PISOS} pisos`);
      return;
    }
    this.inmune = Math.max(0, this.inmune - s);
    const v = velocidad(this.pisos, ritmo());
    this.fachada.tilePositionY -= v * E * s;
    this.rupert.anims.timeScale = Math.max(0.7, v / 60);
    this.dist += v * s;
    if (Math.floor(this.dist / ALTO_PISO) > this.pisos) this.subirPiso();
    // El piso del dpto baja por la pantalla y llega a los pies de Rupert justo al terminar el último piso.
    this.dpto.y = (Y_RUPERT - (META_PISOS * ALTO_PISO - this.dist)) * E;
    if (this.dist >= META_PISOS * ALTO_PISO) {
      this.llegar();
      return;
    }
    this.proxima -= s;
    // En el último tramo ya no cae nada: la puerta tiene que quedar a la vista.
    if (this.proxima <= 0 && META_PISOS * ALTO_PISO - this.dist > 50) this.soltar();
    const rx = this.rupert.x / E;
    for (let i = this.caen.length - 1; i >= 0; i--) {
      const c = this.caen[i];
      const vy = c.tipo === 'moneda' ? v * 0.9 + 30 : v + PELIGRO[c.tipo].vy;
      c.spr.y += vy * s * E;
      if (c.tipo === 'paloma') {
        // Zigzaguea de un carril al de al lado, mirando hacia donde va.
        c.fase = (c.fase ?? 0) + s * 4;
        const antes = c.spr.x;
        c.spr.x = ((c.base ?? 240) + Math.sin(c.fase) * 42) * E;
        c.spr.setFlipX(c.spr.x < antes);
        c.spr.angle = Math.sin(c.fase) * 10;
      } else if (c.tipo !== 'moneda') {
        c.spr.angle += (c.tipo === 'mueble' ? 40 : 160) * s;
      }
      const y = c.spr.y / E;
      const cerca = Math.abs(c.spr.x / E - rx) < PELIGRO[c.tipo].radio && y > Y_RUPERT - ALTO_R && y < Y_RUPERT - 4;
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
