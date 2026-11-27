import Phaser from 'phaser';
import { CHAPAS, type Chapa, opcionesCollar, pedidoCollar, precioCollar } from '../core/minijuegos';
import { COLOR, E, caja, texto } from '../ui/ui';
import { confeti } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 45_000;

/** Armar collares de chapitas copiando el pedido del cliente, en orden. */
export class Collares extends Phaser.Scene {
  private puntos = 0;
  private vendidos = 0;
  private fin = 0;
  private reloj = 0;
  private terminado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private pedido: Chapa[] = [];
  private puestas = 0;
  private capaPedido!: Phaser.GameObjects.Container;
  private capaCollar!: Phaser.GameObjects.Container;
  private hilo!: Phaser.GameObjects.Graphics;
  private bandeja!: Phaser.GameObjects.Container;
  private opciones = 0;

  constructor() {
    super('Collares');
  }

  create(): void {
    this.puntos = 0;
    this.vendidos = 0;
    this.terminado = false;
    this.reloj = 0;
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Collares de chapitas', 0.6);
    this.combo = new Combo(this);

    const g = this.add.graphics();
    caja(g, 40, 44, 400, 52, COLOR.panel);
    texto(this, 50, 46, 'El cliente pide:', { tam: 11, color: COLOR.oro });
    caja(g, 40, 104, 400, 52, 0x3a2b22, COLOR.borde);
    texto(this, 50, 106, 'Tu collar:', { tam: 11, color: COLOR.oro });
    this.hilo = this.add.graphics();
    this.capaPedido = this.add.container(0, 0);
    this.capaCollar = this.add.container(0, 0);

    this.bandeja = this.add.container(0, 0);
    this.opciones = 0;
    aviso(this, 'Copia el collar del cliente\nchapita por chapita, en orden.');
    this.time.delayedCall(1500, () => this.nuevoPedido());
  }

  /** Bandeja de chapitas: hasta 10 botones grandes en dos filas; crece con los collares vendidos. */
  private armarBandeja(): void {
    const n = opcionesCollar(this.vendidos);
    if (n === this.opciones) return;
    if (this.opciones > 0) aviso(this, '¡Chapitas nuevas en la bandeja!', 1000);
    this.opciones = n;
    this.bandeja.removeAll(true);
    const porFila = n <= 5 ? n : Math.ceil(n / 2);
    CHAPAS.slice(0, n).forEach((c, i) => {
      const fila = Math.floor(i / porFila);
      const enFila = Math.min(porFila, n - fila * porFila);
      const x = 240 + (i % porFila - (enFila - 1) / 2) * 86;
      const y = n > porFila ? 186 + fila * 48 : 208;
      const g2 = this.add.graphics();
      caja(g2, x - 30, y - 22, 60, 44, 0x2a1f33, COLOR.borde);
      const img = this.add.image(x * E, y * E, `chapa_${c}`).setScale(E * 1.2).setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => {
        this.tweens.add({ targets: img, scale: E * 1.05, duration: 60, yoyo: true });
        this.poner(c);
      });
      this.bandeja.add([g2, img]);
    });
  }

  private nuevoPedido(): void {
    this.armarBandeja();
    this.pedido = pedidoCollar(this.vendidos);
    this.puestas = 0;
    this.capaPedido.removeAll(true);
    this.capaCollar.removeAll(true);
    this.pedido.forEach((c, i) => {
      this.capaPedido.add(this.add.image(this.xChapa(i) * E, 78 * E, `chapa_${c}`).setScale(E * 0.85));
    });
    this.dibujarHilo();
  }

  private xChapa(i: number): number {
    const paso = 40;
    const ancho = (this.pedido.length - 1) * paso;
    return 240 - ancho / 2 + i * paso;
  }

  private dibujarHilo(): void {
    this.hilo.clear();
    this.hilo.lineStyle(E, 0xc9b48a, 1);
    const x0 = this.xChapa(0) - 20;
    const x1 = this.xChapa(this.pedido.length - 1) + 20;
    this.hilo.beginPath();
    this.hilo.moveTo(x0 * E, 134 * E);
    this.hilo.lineTo(x1 * E, 134 * E);
    this.hilo.strokePath();
  }

  private poner(c: Chapa): void {
    if (this.terminado || this.pedido.length === 0) return;
    const i = this.puestas;
    if (c !== this.pedido[i]) {
      // El collar se rompe: se pierden las chapitas puestas y hay que empezar de nuevo.
      this.puntos -= 3;
      this.combo.error();
      this.marcador.puntos(this.puntos);
      flotar(this, '-3 ¡se cortó!', 240, 128, false);
      this.cameras.main.shake(120, 0.006);
      this.capaCollar.each((o: Phaser.GameObjects.GameObject) => {
        this.tweens.add({ targets: o, y: (o as Phaser.GameObjects.Image).y + 60 * E, alpha: 0, duration: 300 });
      });
      this.time.delayedCall(320, () => this.capaCollar.removeAll(true));
      this.puestas = 0;
      return;
    }
    this.capaCollar.add(this.add.image(this.xChapa(i) * E, 136 * E, `chapa_${c}`).setScale(E * 0.85));
    this.puestas += 1;
    if (this.puestas === this.pedido.length) {
      const precio = this.combo.acierto(precioCollar(this.pedido.length));
      this.puntos += precio;
      this.vendidos += 1;
      this.marcador.puntos(this.puntos);
      flotar(this, `+${precio} ¡vendido!`, 240, 128, true);
      confeti(this, 240 * E, 136 * E, 20);
      this.pedido = [];
      this.time.delayedCall(450, () => !this.terminado && this.nuevoPedido());
    }
  }

  override update(_t: number, dt: number): void {
    // Tiempo propio de la partida, contado desde create(): no depende de relojes que siguen
    // corriendo entre una escena y otra.
    this.reloj += dt;
    const t = this.reloj;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - t);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Vendiste ${this.vendidos} collares`);
    }
  }
}
