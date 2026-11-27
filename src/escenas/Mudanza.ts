import Phaser from 'phaser';
import { sonar } from '../audio/sonido';
import { vibrar } from '../audio/vibrar';
import { type Baul, type Mueble, cabe, hayLugar, llenado, medidas, nuevoBaul, poner, premioBaul, puntosPieza, siguientePieza } from '../core/mudanza';
import { E, boton, texto } from '../ui/ui';
import { brillo, confeti, estallido, polvo, rebote } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, ritmo, terminarMinijuego } from './comun';

const DURACION = 60_000;
/** Segundos extra al cerrar un baúl bien cargado. */
const PREMIO_TIEMPO = 6_000;
const COLS = 8;
const FILAS = 5;
const CELDA = 28;
/** Esquina del baúl (px del mundo). */
const BX = 216;
const BY = 72;
/** Dónde espera la pieza en la vereda. */
const VX = 96;
const VY = 150;

/**
 * Cargar la mudanza (R044, etapas 8 y 9): encastrar cajas y muebles en el baúl del auto.
 * Se arrastra cada pieza al baúl (se ve en verde dónde entra); tocarla o «Girar» la gira. Cuando ya no entra
 * nada, el baúl se cierra solo: cuanto más lleno, más premio y más segundos. Arte provisorio: los objetos y
 * electrodomésticos que ya tenía el juego, sobre un rectángulo de cartón; el baúl se dibuja por código.
 */
export class Mudanza extends Phaser.Scene {
  private puntos = 0;
  private baules = 0;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private baul!: Baul;
  private capaBaul!: Phaser.GameObjects.Container;
  private pieza: { m: Mueble; girado: boolean; cont: Phaser.GameObjects.Container } | null = null;
  private fantasma!: Phaser.GameObjects.Graphics;
  private colocadas = 0;
  private cerrando = false;

  constructor() {
    super('Mudanza');
  }

  create(): void {
    this.puntos = 0;
    this.baules = 0;
    this.reloj = 0;
    this.terminado = false;
    this.cerrando = false;
    this.pieza = null;
    this.fin = DURACION / Math.sqrt(ritmo()) + 1500;
    this.marcador = montarMinijuego(this, 'Cargar la mudanza', 0.6);
    this.combo = new Combo(this);
    this.fantasma = this.add.graphics().setDepth(30);
    // Un toque corto gira la pieza; recién al moverla unos píxeles empieza el arrastre.
    this.input.dragDistanceThreshold = 6 * E;
    this.dibujarVereda();
    this.nuevoBaul(false);
    boton(this, 30, 214, 60, 20, 'Girar', () => this.girar(), 11).cont.setDepth(40);
    boton(this, 96, 214, 72, 20, 'Descartar', () => this.descartar(), 11).cont.setDepth(40);
    boton(this, 300, 232, 100, 20, 'Cerrar baúl', () => this.cerrarBaul(), 11).cont.setDepth(40);
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container, x: number, y: number) => {
      obj.setPosition(x, y);
      this.mostrarFantasma();
    });
    this.input.on('dragend', (p: Phaser.Input.Pointer) => this.soltar(p));
    aviso(this, 'Arrastra cada cosa al baúl. Tócala para girarla.\nQue no sobre nada. Bueno, que sobre poco.', 2200);
    this.time.delayedCall(1200, () => this.nuevaPieza());
  }

  private dibujarVereda(): void {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x000000, 0.25).fillRoundedRect(20 * E, 70 * E, 160 * E, 140 * E, 6 * E);
    texto(this, VX + 4, 76, 'Para cargar', { tam: 10, color: '#c9b9a6' }).setOrigin(0.5, 0).setDepth(3);
  }

  /** El baúl abierto del auto: carrocería, tapa levantada y la grilla de casillas. */
  private nuevoBaul(conAuto: boolean): void {
    this.baul = nuevoBaul(COLS, FILAS);
    this.colocadas = 0;
    this.capaBaul?.destroy();
    const c = this.add.container(0, 0).setDepth(5);
    this.capaBaul = c;
    const g = this.add.graphics();
    const w = COLS * CELDA;
    const h = FILAS * CELDA;
    // Tapa abierta arriba, carrocería alrededor y paragolpes abajo.
    g.fillStyle(0x5b7fa6, 1).fillRoundedRect((BX - 10) * E, (BY - 30) * E, (w + 20) * E, 22 * E, 6 * E);
    g.fillStyle(0x89a9cc, 1).fillRect((BX - 4) * E, (BY - 26) * E, (w + 8) * E, 6 * E);
    g.fillStyle(0x4a6a8f, 1).fillRect((BX - 12) * E, (BY - 6) * E, (w + 24) * E, (h + 16) * E);
    g.fillStyle(0x1e1a24, 1).fillRect((BX - 2) * E, (BY - 2) * E, (w + 4) * E, (h + 4) * E);
    g.fillStyle(0x2c2734, 1).fillRect(BX * E, BY * E, w * E, h * E);
    g.lineStyle(E, 0x3a3444, 1);
    for (let i = 1; i < COLS; i++) g.lineBetween((BX + i * CELDA) * E, BY * E, (BX + i * CELDA) * E, (BY + h) * E);
    for (let j = 1; j < FILAS; j++) g.lineBetween(BX * E, (BY + j * CELDA) * E, (BX + w) * E, (BY + j * CELDA) * E);
    g.fillStyle(0x3a3a40, 1).fillRect((BX - 14) * E, (BY + h + 10) * E, (w + 28) * E, 8 * E);
    g.fillStyle(0xe05a4f, 1).fillRect((BX - 10) * E, (BY + h + 2) * E, 10 * E, 6 * E).fillRect((BX + w) * E, (BY + h + 2) * E, 10 * E, 6 * E);
    c.add(g);
    c.add(texto(this, BX + w / 2, BY + h + 20, `Baúl ${this.baules + 1}`, { tam: 10, color: '#c9b9a6' }).setOrigin(0.5, 0));
    if (conAuto) {
      c.x = -300 * E;
      this.tweens.add({ targets: c, x: 0, duration: 450, ease: 'Back.easeOut' });
    }
  }

  private dibujarPieza(m: Mueble, girado: boolean): Phaser.GameObjects.Container {
    const { w, h } = medidas(m, girado);
    const c = this.add.container(VX * E, VY * E).setDepth(25);
    const g = this.add.graphics();
    g.fillStyle(0xb98a56, 1).fillRoundedRect((-w * CELDA) / 2 * E + E, (-h * CELDA) / 2 * E + E, (w * CELDA - 2) * E, (h * CELDA - 2) * E, 3 * E);
    g.lineStyle(E, 0x6b4a2a, 1).strokeRoundedRect((-w * CELDA) / 2 * E + E, (-h * CELDA) / 2 * E + E, (w * CELDA - 2) * E, (h * CELDA - 2) * E, 3 * E);
    c.add(g);
    if (this.textures.exists(m.imagen)) {
      const img = this.add.image(0, 0, m.imagen);
      // La imagen se dibuja como el mueble sin girar y después se gira con la pieza.
      const esc = Math.min(((m.w * CELDA - 6) * E) / img.width, ((m.h * CELDA - 6) * E) / img.height);
      img.setScale(esc).setAngle(girado ? 90 : 0);
      c.add(img);
    }
    c.setSize(w * CELDA * E, h * CELDA * E);
    return c;
  }

  private nuevaPieza(): void {
    if (this.terminado || this.cerrando) return;
    const m = siguientePieza(this.baul);
    if (!hayLugar(this.baul, m)) {
      this.cerrarBaul();
      return;
    }
    const cont = this.dibujarPieza(m, false);
    this.pieza = { m, girado: false, cont };
    this.prepararArrastre(cont);
    cont.setScale(0);
    this.tweens.add({ targets: cont, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.nombre?.destroy();
    this.nombre = texto(this, VX + 4, 192, m.nombre, { tam: 10 }).setOrigin(0.5, 0).setDepth(26);
  }

  private nombre?: Phaser.GameObjects.Text;

  private prepararArrastre(cont: Phaser.GameObjects.Container): void {
    cont.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(cont);
    let desde = { x: 0, y: 0 };
    cont.on('pointerdown', (p: Phaser.Input.Pointer) => (desde = { x: p.x, y: p.y }));
    cont.on('pointerup', (p: Phaser.Input.Pointer) => {
      // Un toque sin arrastrar gira la pieza.
      if (Math.hypot(p.x - desde.x, p.y - desde.y) < 8 * E) this.girar();
    });
  }

  /** Casilla donde caería la pieza (esquina de arriba a la izquierda), según dónde está ahora. */
  private casilla(): { x: number; y: number; w: number; h: number } | null {
    const p = this.pieza;
    if (!p) return null;
    const { w, h } = medidas(p.m, p.girado);
    const x = Math.round((p.cont.x / E - (w * CELDA) / 2 - BX) / CELDA);
    const y = Math.round((p.cont.y / E - (h * CELDA) / 2 - BY) / CELDA);
    return { x, y, w, h };
  }

  private mostrarFantasma(): void {
    const g = this.fantasma;
    g.clear();
    const c = this.casilla();
    if (!c || c.x < -1 || c.y < -1 || c.x > COLS || c.y > FILAS) return;
    const ok = cabe(this.baul, c.w, c.h, c.x, c.y);
    g.fillStyle(ok ? 0x7fd16b : 0xff6b5b, 0.35).fillRect((BX + c.x * CELDA) * E, (BY + c.y * CELDA) * E, c.w * CELDA * E, c.h * CELDA * E);
  }

  private soltar(_p: Phaser.Input.Pointer): void {
    const p = this.pieza;
    this.fantasma.clear();
    if (!p || this.terminado) return;
    const c = this.casilla()!;
    if (poner(this.baul, c.w, c.h, c.x, c.y, this.colocadas + 1)) {
      this.colocadas += 1;
      p.cont.disableInteractive();
      this.tweens.add({ targets: p.cont, x: (BX + (c.x + c.w / 2) * CELDA) * E, y: (BY + (c.y + c.h / 2) * CELDA) * E, duration: 90 });
      this.capaBaul.add(p.cont);
      p.cont.setDepth(6);
      rebote(this, p.cont, 1.08, 90);
      const pts = this.combo.acierto(puntosPieza(p.m));
      this.puntos += pts;
      this.marcador.puntos(this.puntos);
      flotar(this, `+${pts}`, BX + (c.x + c.w / 2) * CELDA, BY + c.y * CELDA, true);
      sonar('pop');
      this.pieza = null;
      if (llenado(this.baul) >= 1) this.time.delayedCall(250, () => this.cerrarBaul());
      else this.time.delayedCall(200, () => this.nuevaPieza());
      return;
    }
    // No entra: vuelve a la vereda.
    sonar('error');
    vibrar('fuerte');
    this.tweens.add({ targets: p.cont, x: VX * E, y: VY * E, duration: 220, ease: 'Back.easeOut' });
  }

  private girar(): void {
    const p = this.pieza;
    if (!p || this.terminado) return;
    p.girado = !p.girado;
    const x = p.cont.x;
    const y = p.cont.y;
    p.cont.destroy();
    p.cont = this.dibujarPieza(p.m, p.girado).setPosition(x, y);
    this.prepararArrastre(p.cont);
    sonar('giro');
    rebote(this, p.cont, 1.1, 80);
  }

  /** Lo que no entra se deja en la vereda: resta poco y corta el combo. */
  private descartar(): void {
    const p = this.pieza;
    if (!p || this.terminado) return;
    this.pieza = null;
    this.combo.error();
    this.puntos = Math.max(0, this.puntos - 3);
    this.marcador.puntos(this.puntos);
    polvo(this, p.cont.x, p.cont.y);
    this.tweens.add({ targets: p.cont, alpha: 0, y: p.cont.y + 20 * E, duration: 250, onComplete: () => p.cont.destroy() });
    this.time.delayedCall(260, () => this.nuevaPieza());
  }

  /** Cierra el baúl: premio según lo lleno que quedó, segundos extra y llega otro auto. */
  private cerrarBaul(): void {
    if (this.terminado || this.cerrando) return;
    if (this.colocadas === 0) {
      flotar(this, 'Está vacío', BX + (COLS * CELDA) / 2, BY + 60, false, false);
      return;
    }
    this.cerrando = true;
    this.pieza?.cont.destroy();
    this.pieza = null;
    this.nombre?.destroy();
    const f = llenado(this.baul);
    const premio = premioBaul(this.baul);
    this.baules += 1;
    this.puntos += premio;
    this.marcador.puntos(this.puntos);
    const cx = BX + (COLS * CELDA) / 2;
    if (premio > 0) {
      this.fin += PREMIO_TIEMPO;
      flotar(this, `${Math.round(f * 100)} % lleno: +${premio} y +${PREMIO_TIEMPO / 1000} s`, cx, BY + 40, true, false);
      confeti(this, cx * E, BY * E, f >= 1 ? 40 : 20);
      brillo(this, cx * E, (BY + 60) * E);
      sonar(f >= 1 ? 'festejo' : 'fin');
      vibrar(f >= 1 ? 'logro' : 'suave');
    } else {
      flotar(this, `${Math.round(f * 100)} % lleno. Viaja medio vacío.`, cx, BY + 40, false, false);
    }
    // La tapa baja, el auto se va y llega otro.
    const tapa = this.add.rectangle((BX - 10) * E, (BY - 30) * E, (COLS * CELDA + 20) * E, 10 * E, 0x5b7fa6).setOrigin(0).setDepth(7);
    this.tweens.add({ targets: tapa, height: (FILAS * CELDA + 30) * E, duration: 300, ease: 'Quad.easeIn' });
    this.time.delayedCall(700, () => {
      estallido(this, (BX - 10) * E, (BY + FILAS * CELDA) * E, { textura: 'fx_px', colores: [0x9a9a9a, 0x6a6a6a], cantidad: 10, velocidad: [20, 60], vida: 500 });
      this.tweens.add({ targets: [this.capaBaul, tapa], x: `+=${400 * E}`, duration: 500, ease: 'Quad.easeIn', onComplete: () => {
        tapa.destroy();
        if (this.terminado) return;
        this.nuevoBaul(true);
        this.cerrando = false;
        this.time.delayedCall(450, () => this.nuevaPieza());
      } });
    });
  }

  override update(_t: number, dt: number): void {
    if (this.terminado) return;
    this.reloj += dt;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(resta / 1000));
    if (resta <= 0) {
      this.terminado = true;
      this.pieza?.cont.disableInteractive();
      terminarMinijuego(this, this.puntos, `Cargaste ${this.baules} ${this.baules === 1 ? 'baúl' : 'baúles'}`);
    }
  }
}

