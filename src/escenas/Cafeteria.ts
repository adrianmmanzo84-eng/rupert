import Phaser from 'phaser';
import { sonar } from '../audio/sonido';
import { CAPACIDAD_BANDEJA, MENU_CAFETERIA, type Plato, pacienciaMesa, pedidoCafeteria, pedidoCorrecto, puntosEntrega } from '../core/cafeteria';
import { COLOR, E, boton, caja, texto } from '../ui/ui';
import { brillo, monedasHacia, polvo, rebote } from '../ui/efectos';
import { Combo, type Marcador, aviso, flotar, montarMinijuego, ritmo, terminarMinijuego } from './comun';

const DURACION = 60_000;
const MESAS = [104, 240, 376];
const Y_MESA = 150;
const NOMBRES: Record<Plato, string> = { cafe: 'Café', sandwich: 'Sándwich', manzana: 'Manzana', sopa: 'Sopa' };

interface Mesa {
  x: number;
  pedido: Plato[];
  paciencia: number;
  total: number;
  cliente: Phaser.GameObjects.Sprite | null;
  globo: Phaser.GameObjects.Container | null;
  barra: Phaser.GameObjects.Graphics;
  /** Momento (ms del reloj) en que llega el próximo cliente si la mesa está vacía. */
  llega: number;
}

/**
 * Turno en la cafetería del instituto (R044, etapas 7 a 9): tres mesas piden de 1 a 3 cosas. Se tocan los
 * platos del mostrador para cargar la bandeja (hasta 3) y después la mesa para servir. Si la bandeja no es
 * exactamente el pedido, el cliente se queja y se vacía la bandeja. Si se le acaba la paciencia, se va.
 * Arte provisorio: los peatones de los volantes hacen de estudiantes; mesas y mostrador se dibujan por código.
 */
export class Cafeteria extends Phaser.Scene {
  private puntos = 0;
  private atendidos = 0;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private marcador!: Marcador;
  private combo!: Combo;
  private mesas: Mesa[] = [];
  private bandeja: Plato[] = [];
  private capaBandeja!: Phaser.GameObjects.Container;

  constructor() {
    super('Cafeteria');
  }

  create(): void {
    this.puntos = 0;
    this.atendidos = 0;
    this.reloj = 0;
    this.terminado = false;
    this.bandeja = [];
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Turno en la cafetería', 0.55);
    this.combo = new Combo(this);
    this.dibujarSalon();
    this.mesas = MESAS.map((x, i) => ({ x, pedido: [], paciencia: 0, total: 1, cliente: null, globo: null, barra: this.add.graphics().setDepth(22), llega: 1200 + i * 1400 }));
    this.capaBandeja = this.add.container(0, 0).setDepth(30);
    this.dibujarBandeja();
    aviso(this, 'Toca los platos para cargar la bandeja\ny después la mesa que los pidió.', 2200);
  }

  private dibujarSalon(): void {
    const g = this.add.graphics().setDepth(5);
    for (const x of MESAS) {
      g.fillStyle(0x000000, 0.3).fillEllipse(x * E, (Y_MESA + 22) * E, 84 * E, 12 * E);
      g.fillStyle(0x7a4a2e, 1).fillRect((x - 38) * E, (Y_MESA - 4) * E, 76 * E, 10 * E);
      g.fillStyle(0x9a6440, 1).fillRect((x - 38) * E, (Y_MESA - 6) * E, 76 * E, 4 * E);
      g.fillStyle(0x5a3620, 1).fillRect((x - 34) * E, (Y_MESA + 6) * E, 5 * E, 16 * E).fillRect((x + 29) * E, (Y_MESA + 6) * E, 5 * E, 16 * E);
      // Zona que se toca para servir.
      const z = this.add.zone(x * E, (Y_MESA - 30) * E, 110 * E, 110 * E).setInteractive();
      z.on('pointerdown', () => this.servir(MESAS.indexOf(x)));
    }
    // Mostrador abajo, con un botón por plato.
    const m = this.add.graphics().setDepth(20);
    caja(m, 8, 196, 464, 66, COLOR.panel);
    texto(this, 16, 199, 'Mostrador', { tam: 10, color: '#c9b9a6' }).setDepth(21);
    MENU_CAFETERIA.forEach((p, i) => {
      const x = 20 + i * 56;
      const b = this.add.zone((x + 25) * E, 236 * E, 52 * E, 40 * E).setInteractive().setDepth(22);
      const fondo = this.add.graphics().setDepth(21);
      fondo.fillStyle(0x3a2f48, 1).fillRoundedRect(x * E, 214 * E, 50 * E, 44 * E, 4 * E);
      const ic = this.add.image((x + 25) * E, 232 * E, p).setDepth(22);
      ic.setScale((24 * E) / Math.max(ic.width, ic.height));
      texto(this, x + 25, 246, NOMBRES[p], { tam: 9 }).setOrigin(0.5, 0).setDepth(22);
      b.on('pointerdown', () => this.cargar(p, ic));
    });
    boton(this, 404, 226, 60, 20, 'Vaciar', () => this.vaciar(), 10).cont.setDepth(31);
  }

  private dibujarBandeja(): void {
    const c = this.capaBandeja;
    c.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(0xb8bcc4, 1).fillEllipse(330 * E, 236 * E, 120 * E, 30 * E);
    g.fillStyle(0x9097a2, 1).fillEllipse(330 * E, 238 * E, 110 * E, 24 * E);
    c.add(g);
    c.add(texto(this, 330, 200, `Bandeja ${this.bandeja.length}/${CAPACIDAD_BANDEJA}`, { tam: 10, color: '#c9b9a6' }).setOrigin(0.5, 0));
    this.bandeja.forEach((p, i) => {
      const ic = this.add.image((300 + i * 30) * E, 232 * E, p);
      ic.setScale((22 * E) / Math.max(ic.width, ic.height));
      c.add(ic);
    });
  }

  private cargar(p: Plato, ic: Phaser.GameObjects.Image): void {
    if (this.terminado) return;
    if (this.bandeja.length >= CAPACIDAD_BANDEJA) {
      flotar(this, 'La bandeja está llena', 330, 196, false, false);
      sonar('error');
      return;
    }
    this.bandeja.push(p);
    sonar('pop');
    rebote(this, ic, 1.25, 80);
    this.dibujarBandeja();
  }

  private vaciar(): void {
    if (!this.bandeja.length) return;
    this.bandeja = [];
    sonar('caer');
    this.dibujarBandeja();
  }

  private llegaCliente(mesa: Mesa): void {
    mesa.pedido = pedidoCafeteria(this.atendidos);
    mesa.total = pacienciaMesa(mesa.pedido, ritmo());
    mesa.paciencia = mesa.total;
    const hoja = Math.floor(Math.random() * 5);
    const clave = `peaton${hoja}`;
    if (this.textures.exists(clave)) {
      const s = this.add.sprite((mesa.x + 22) * E, (Y_MESA + 6) * E, clave, 0).setOrigin(0.5, 1).setDepth(4).setScale(E * 0.95).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 250 });
      mesa.cliente = s;
    }
    // Globo con el pedido.
    const g = this.add.container(mesa.x * E, (Y_MESA - 62) * E).setDepth(23);
    const fondo = this.add.graphics();
    const w = 14 + mesa.pedido.length * 22;
    fondo.fillStyle(0xf3ead8, 1).fillRoundedRect((-w / 2) * E, -14 * E, w * E, 28 * E, 6 * E);
    fondo.fillTriangle(-4 * E, 14 * E, 4 * E, 14 * E, 0, 20 * E);
    g.add(fondo);
    mesa.pedido.forEach((p, i) => {
      const ic = this.add.image((-w / 2 + 18 + i * 22) * E, 0, p);
      ic.setScale((18 * E) / Math.max(ic.width, ic.height));
      g.add(ic);
    });
    g.setScale(0);
    this.tweens.add({ targets: g, scale: 1, duration: 220, ease: 'Back.easeOut' });
    mesa.globo = g;
    sonar('aviso');
  }

  private irse(mesa: Mesa, contento: boolean): void {
    const s = mesa.cliente;
    if (s) this.tweens.add({ targets: s, alpha: 0, x: s.x + (contento ? 30 : -30) * E, duration: 300, onComplete: () => s.destroy() });
    mesa.globo?.destroy();
    mesa.cliente = null;
    mesa.globo = null;
    mesa.pedido = [];
    mesa.barra.clear();
    mesa.llega = this.reloj + 900 + Math.random() * 1400;
  }

  private servir(i: number): void {
    const mesa = this.mesas[i];
    if (this.terminado || !mesa.pedido.length || !this.bandeja.length) return;
    if (pedidoCorrecto(this.bandeja, mesa.pedido)) {
      const pts = this.combo.acierto(puntosEntrega(mesa.pedido, mesa.paciencia / mesa.total));
      this.puntos += pts;
      this.atendidos += 1;
      this.marcador.puntos(this.puntos);
      flotar(this, `+${pts}`, mesa.x, Y_MESA - 70, true);
      brillo(this, mesa.x * E, (Y_MESA - 20) * E);
      monedasHacia(this, mesa.x * E, (Y_MESA - 20) * E, 40 * E, 20 * E, 3);
      this.bandeja = [];
      this.dibujarBandeja();
      this.irse(mesa, true);
    } else {
      this.combo.error();
      flotar(this, al(['¡Esto no pedí!', '¿Y mi café?', 'Le falta algo...', 'Esto es de otra mesa']), mesa.x, Y_MESA - 70, false);
      polvo(this, mesa.x * E, (Y_MESA - 30) * E);
      mesa.paciencia = Math.max(0.5, mesa.paciencia - mesa.total * 0.3);
      this.bandeja = [];
      this.dibujarBandeja();
    }
  }

  override update(_t: number, dt: number): void {
    if (this.terminado) return;
    this.reloj += dt;
    for (const mesa of this.mesas) {
      if (!mesa.pedido.length) {
        if (this.reloj >= mesa.llega) this.llegaCliente(mesa);
        continue;
      }
      mesa.paciencia -= dt / 1000;
      const f = Math.max(0, mesa.paciencia / mesa.total);
      const b = mesa.barra;
      b.clear();
      b.fillStyle(0x000000, 0.6).fillRect((mesa.x - 26) * E, (Y_MESA - 44) * E, 52 * E, 5 * E);
      b.fillStyle(f > 0.5 ? 0x7fd16b : f > 0.25 ? 0xffc24b : 0xff6b5b, 1).fillRect((mesa.x - 25) * E, (Y_MESA - 43) * E, 50 * f * E, 3 * E);
      if (mesa.paciencia <= 0) {
        this.combo.error();
        this.puntos = Math.max(0, this.puntos - 3);
        this.marcador.puntos(this.puntos);
        flotar(this, 'Se fue sin comer', mesa.x, Y_MESA - 70, false);
        this.irse(mesa, false);
      }
    }
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(resta / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Atendiste ${this.atendidos} ${this.atendidos === 1 ? 'mesa' : 'mesas'}`);
    }
  }
}

function al<T>(l: T[]): T {
  return l[Math.floor(Math.random() * l.length)];
}
