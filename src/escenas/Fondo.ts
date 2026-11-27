import Phaser from 'phaser';
import { INSIGNIAS, type Insignia, MAX_POR_DIA, PRODUCTOS, type Producto, comprasHoy, productoDe, revisarInsignias } from '../core/compras';
import { CONFIG, aportar, comprobarMeta, metaActual, puedeAportarPA } from '../core/estado';
import { nombreBarrio } from '../core/barrios';
import { fondoDeEtapa } from '../core/lugares';
import { HITOS } from '../core/textos';
import { comprarProducto, type ResultadoCompra } from '../compras/flujo';
import { pasarela } from '../compras/pasarela';
import { enviarAporte } from '../red/servidor';
import { MODO_PRUEBAS, guardarPartida, juego } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, caja, panel, texto } from '../ui/ui';

type Pestana = 'aportar' | 'ayudas' | 'insignias';

/**
 * Fondo de Rupert (R020): la meta mundial, aportar monedas, las Ayudas (compras con dinero real) y las insignias.
 * La meta es la del barrio del jugador (R021). Mientras no haya servidor (fase 2), el resto del barrio está simulado.
 */
export class Fondo extends Phaser.Scene {
  private volver = 'Hogar';
  private pestana: Pestana = 'aportar';
  private meta!: Phaser.GameObjects.Container;
  private contenido!: Phaser.GameObjects.Container;
  private pestanas: { id: Pestana; b: ReturnType<typeof boton> }[] = [];
  private precios: Record<string, string> = {};
  private modo: 'play' | 'simulada' | 'ninguna' = 'ninguna';
  private aviso?: Phaser.GameObjects.Text;

  constructor() {
    super('Fondo');
  }

  init(datos: { volver?: string; pestana?: Pestana }): void {
    this.volver = datos.volver ?? 'Hogar';
    this.pestana = datos.pestana ?? 'aportar';
  }

  create(): void {
    this.add.image(0, 0, fondoDeEtapa(juego.e.etapa)).setOrigin(0).setScale(E);
    this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, 0.72).setOrigin(0);
    texto(this, 12, 6, 'Fondo de Rupert', { tam: 18, color: COLOR.oro });
    boton(this, 396, 7, 76, 20, 'Volver', () => this.salir(), 12);
    this.meta = this.add.container(0, 0);
    this.contenido = this.add.container(0, 0);

    const nombres: [Pestana, string][] = [['aportar', 'Aportar'], ['ayudas', 'Ayudas'], ['insignias', 'Insignias']];
    this.pestanas = nombres.map(([id, s], i) => ({ id, b: boton(this, 12 + i * 100, 86, 94, 20, s, () => this.mostrar(id), 12) }));

    this.dibujarMeta();
    this.mostrar(this.pestana);
    const alBarrio = () => this.dibujarMeta();
    this.game.events.on('barrio', alBarrio);
    this.events.once('shutdown', () => this.game.events.off('barrio', alBarrio));
    void pasarela().then(async (p) => {
      this.modo = p.modo;
      this.precios = await p.precios();
      if (this.pestana === 'ayudas' && this.scene.isActive()) this.mostrar('ayudas');
    });
  }

  /** Botón Atrás del teléfono: vuelve a la pantalla de la que vino. */
  atras(): boolean {
    this.salir();
    return true;
  }

  private salir(): void {
    guardarPartida();
    if (this.volver === 'Hogar') this.registry.set('entrando', true);
    this.scene.start(this.volver);
  }

  private dibujarMeta(): void {
    const e = juego.e;
    this.meta.removeAll(true);
    const g = this.add.graphics();
    caja(g, 8, 30, 464, 50, COLOR.panel);
    this.meta.add(g);
    const meta = metaActual(e);
    if (meta === null) {
      this.meta.add(texto(this, 240, 46, '¡Rupert cumplió todas las metas! Está desconcertado: nunca le había pasado.', { tam: 12, color: COLOR.verde }).setOrigin(0.5, 0));
      return;
    }
    const f = Math.min(1, e.fondo / meta);
    this.meta.add(texto(this, 18, 33, `Meta ${e.etapa + 1}: ${HITOS[e.etapa + 1] ?? ''}`, { tam: 12 }));
    this.meta.add(texto(this, 462, 33, `${Math.floor(e.fondo)} / ${meta} PA (${Math.floor(f * 100)}%)`, { tam: 12, color: COLOR.oro }).setOrigin(1, 0));
    g.fillStyle(0x000000, 0.7).fillRect(18 * E, 51 * E, 444 * E, 10 * E);
    g.fillStyle(0xffb347, 1).fillRect(19 * E, 52 * E, 442 * f * E, 8 * E);
    const nota = juego.enLinea ? 'Conectado: lo que aporta cada vecino se suma aquí.' : 'Sin conexión: el resto del barrio está simulado.';
    this.meta.add(texto(this, 18, 64, `${nombreBarrio(e.barrio)} · ${juego.vecinos} de ${juego.cupo} vecinos · ${nota}`, { tam: 9, color: '#c9b9a6' }));
  }

  private mostrar(p: Pestana): void {
    this.pestana = p;
    for (const t of this.pestanas) t.b.cont.setAlpha(t.id === p ? 1 : 0.55);
    this.contenido.removeAll(true);
    const g = this.add.graphics();
    caja(g, 8, 110, 464, 154, COLOR.panel);
    this.contenido.add(g);
    if (p === 'aportar') this.pestanaAportar();
    else if (p === 'ayudas') this.pestanaAyudas();
    else this.pestanaInsignias();
  }

  // ——— Aportar monedas ———

  private pestanaAportar(): void {
    const e = juego.e;
    const disp = puedeAportarPA(e);
    const quedanHoy = Math.max(0, CONFIG.topeDiarioPA - e.aportadoHoy);
    const c = this.contenido;
    c.add(texto(this, 18, 116, `Tus monedas: ${e.monedas}   ·   Cada ${CONFIG.monedasPorPA} monedas = 1 PA`, { tam: 12 }));
    c.add(texto(this, 18, 132, `Hoy puedes aportar ${quedanHoy} PA más (tope diario: ${CONFIG.topeDiarioPA} PA).`, { tam: 11, color: '#c9b9a6' }));
    const opciones: [string, number][] = [['1 PA', 1], ['5 PA', 5], ['10 PA', 10], [`Todo (${disp} PA)`, disp]];
    opciones.forEach(([s, n], i) => {
      const b = boton(this, 18 + i * 112, 154, 104, 28, s, () => this.aportarMonedas(n), 13);
      b.activar(n > 0 && disp >= n);
      c.add(b.cont);
    });
    c.add(texto(this, 18, 192, `Aportaste en total ${Math.floor(e.aportado)} PA. Gracias a todos. Rupert sigue adelante, aunque no sabe hacia dónde.`, { tam: 11 }));
    // Solo sin conexión: con servidor, el fondo es el del barrio real y no se inventa.
    if (MODO_PRUEBAS && !juego.enLinea) {
      // Un cuarto de la meta por toque, para recorrer las etapas rápido.
      const extra = Math.ceil((metaActual(e) ?? 0) / 4);
      const b = boton(this, 18, 230, 190, 22, `Pruebas: +${extra} PA`, () => {
        juego.e.fondo += extra;
        this.trasAportar(extra);
      }, 11);
      c.add(b.cont);
    }
  }

  private aportarMonedas(pa: number): void {
    const n = aportar(juego.e, pa);
    if (n <= 0) return;
    this.trasAportar(n);
    // Al barrio real (si hay servidor); si no hay red, queda pendiente y se reenvía después.
    void enviarAporte(n).then(() => {
      if (this.scene.isActive()) this.dibujarMeta();
    });
  }

  /** Revisa insignias y meta después de sumar al fondo, guarda y redibuja. */
  private trasAportar(pa: number): void {
    const nuevas = revisarInsignias(juego.e);
    const subio = comprobarMeta(juego.e);
    if (subio) juego.subioPendiente = true;
    guardarPartida();
    this.dibujarMeta();
    this.mostrar(this.pestana);
    if (subio) this.avisar('¡Meta cumplida! Vuelve con Rupert para verlo.', COLOR.verde);
    else if (nuevas.length) this.avisar(`¡Nueva insignia: ${nuevas.map((i) => i.nombre).join(', ')}!`, COLOR.oro);
    else this.avisar(`+${pa} PA al fondo. ¡Gracias! Rupert te debe una. Otra más.`, COLOR.oro);
  }

  private avisar(s: string, color: string): void {
    this.aviso?.destroy();
    const t = texto(this, 240, 70, s, { tam: 12, color, alinear: 'center' }).setOrigin(0.5).setDepth(50)
      .setBackgroundColor('#1b1424ee').setPadding(6 * E, 2 * E, 6 * E, 2 * E);
    this.aviso = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 500, onComplete: () => t.destroy() });
  }

  // ——— Ayudas (compras) ———

  private precio(p: Producto): string {
    return this.precios[p.id] ?? `US$ ${p.usd}`;
  }

  private pestanaAyudas(): void {
    const c = this.contenido;
    const e = juego.e;
    PRODUCTOS.forEach((p, i) => {
      const y = 114 + i * 27;
      c.add(texto(this, 18, y, p.nombre, { tam: 12, color: COLOR.oro }));
      c.add(texto(this, 18, y + 12, p.recibe, { tam: 9, color: '#c9b9a6' }));
      if (p.pa > 0) c.add(texto(this, 330, y + 5, `+${p.pa} PA`, { tam: 11, color: '#ffb347' }).setOrigin(1, 0));
      const b = boton(this, 342, y + 2, 120, 22, this.precio(p), () => this.confirmar(p), 11);
      b.activar(this.modo !== 'ninguna' && !(p.pase && e.pase === e.etapa));
      c.add(b.cont);
    });
    const nota =
      this.modo === 'ninguna'
        ? 'Las Ayudas se compran en la app de Android.'
        : this.modo === 'simulada'
          ? 'Versión de prueba: las compras son simuladas y no cobran nada.'
          : `Cada compra te da algo y suma al fondo de todos. Máximo ${MAX_POR_DIA} por día.`;
    c.add(texto(this, 240, 252, nota, { tam: 9, color: '#c9b9a6' }).setOrigin(0.5, 0));
  }

  private confirmar(p: Producto): void {
    const cerrar = panel(
      this,
      `¿Comprar ${p.nombre}?`,
      [
        { titulo: `Precio: ${this.precio(p)}`, detalle: this.modo === 'simulada' ? 'Prueba: no se cobra nada' : 'Lo cobra Google Play' },
        { titulo: 'Recibes', detalle: p.recibe },
        ...(p.pa > 0 ? [{ titulo: `Suma ${p.pa} PA al fondo de Rupert`, detalle: 'Se ve en la meta de todos los jugadores' }] : []),
        {
          titulo: 'Confirmar compra',
          accion: 'Comprar',
          alPulsar: () => {
            cerrar();
            void comprarProducto(p.id).then((r) => this.resultado(p.id, r));
          },
        },
      ],
      `Compras de hoy: ${comprasHoy(juego.e, Date.now())} de ${MAX_POR_DIA}.`,
    );
  }

  private resultado(id: string, r: ResultadoCompra): void {
    if (!this.scene.isActive()) return;
    const p = productoDe(id);
    this.dibujarMeta();
    this.mostrar(this.pestana);
    const mensajes: Record<ResultadoCompra, [string, string] | null> = {
      ok: [juego.subioPendiente ? '¡Gracias! ¡Meta cumplida! Vuelve con Rupert para verlo.' : `¡Gracias! Recibiste: ${p?.recibe ?? ''}`, COLOR.verde],
      cancelada: null,
      pendiente: ['El pago quedó pendiente. Se entrega cuando Google Play lo apruebe.', COLOR.oro],
      limite: [`Llegaste al máximo de ${MAX_POR_DIA} compras por hoy.`, COLOR.rojo],
      pase_activo: ['Ya tienes el pase de esta meta.', COLOR.oro],
      noDisponible: ['Las Ayudas se compran en la app de Android.', COLOR.oro],
      error: ['No se pudo completar. Si se cobró, se entrega al volver a abrir el juego.', COLOR.rojo],
    };
    const m = mensajes[r];
    if (m) this.avisar(m[0], m[1]);
  }

  // ——— Insignias ———

  private pestanaInsignias(): void {
    const e = juego.e;
    const c = this.contenido;
    INSIGNIAS.forEach((ins, i) => {
      const x = 66 + (i % 4) * 116;
      const y = 140 + Math.floor(i / 4) * 58;
      this.medalla(ins, x, y, e.insignias.includes(ins.id));
    });
    const pase = e.pase === e.etapa ? '   ·   Pase activo: doble de monedas en changas' : '';
    c.add(texto(this, 18, 248, `Racha: ${e.racha} ${e.racha === 1 ? 'día' : 'días'}   ·   Aportaste ${Math.floor(e.aportado)} PA${pase}`, { tam: 10, color: '#c9b9a6' }));
  }

  /** Medalla dibujada con formas: color propio si se ganó, gris si falta. */
  private medalla(ins: Insignia, x: number, y: number, tiene: boolean): void {
    const g = this.add.graphics();
    const color = tiene ? ins.color : 0x4a4152;
    g.fillStyle(tiene ? 0xc1642c : 0x3a3340, 1).fillTriangle((x - 9) * E, (y - 20) * E, (x - 2) * E, (y - 20) * E, (x - 6) * E, (y - 6) * E);
    g.fillTriangle((x + 2) * E, (y - 20) * E, (x + 9) * E, (y - 20) * E, (x + 6) * E, (y - 6) * E);
    g.fillStyle(0x1b1424, 1).fillCircle(x * E, y * E, 12 * E);
    g.fillStyle(color, 1).fillCircle(x * E, y * E, 10.5 * E);
    g.fillStyle(0xffffff, tiene ? 0.35 : 0.08).fillCircle((x - 3) * E, (y - 3) * E, 4 * E);
    this.contenido.add(g);
    this.contenido.add(texto(this, x, y + 13, ins.nombre, { tam: 10, color: tiene ? COLOR.tinta : '#8a7f99' }).setOrigin(0.5, 0));
    this.contenido.add(texto(this, x, y + 24, tiene ? '¡Conseguida!' : ins.como, { tam: 8, color: tiene ? COLOR.verde : '#8a7f99' }).setOrigin(0.5, 0));
  }
}
