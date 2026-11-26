import Phaser from 'phaser';
import {
  ARTICULOS, ASEO, COMIDAS, CONFIG, type Objeto, aportar, charlar, comprar, descansar, estaTriste,
  metaActual, puedeAportarPA, recoger, usar,
} from '../core/estado';
import { CHARLA_FELIZ, CHARLA_HAMBRE, CHARLA_SUCIO, CHARLA_TRISTE, HITOS, type Lugar, MIRAR, NOMBRES, USAR, al } from '../core/textos';
import { MODO_PRUEBAS, guardarPartida, juego, paso } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, caja, panel, texto } from '../ui/ui';
import { LUGARES, MINIJUEGOS, catalogo, estadoMinijuego, lugarDeEtapa } from '../core/minijuegos';
import { ETAPAS_CON_SPRITES } from './Arranque';

interface Zona {
  lugar: Lugar;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Dónde se para Rupert para usarlo. */
  px: number;
  py: number;
}

/** Zonas tocables del callejón (coordenadas del mundo 480×270). El orden decide cuál gana si se pisan. */
const ZONAS: Zona[] = [
  { lugar: 'farola', x0: 430, y0: 0, x1: 464, y1: 192, px: 426, py: 228 },
  { lugar: 'contenedor', x0: 292, y0: 78, x1: 410, y1: 170, px: 345, py: 205 },
  { lugar: 'puerta', x0: 250, y0: 60, x1: 290, y1: 138, px: 270, py: 200 },
  { lugar: 'tarima', x0: 216, y0: 92, x1: 246, y1: 140, px: 232, py: 200 },
  { lugar: 'charco', x0: 222, y0: 140, x1: 292, y1: 182, px: 258, py: 212 },
  { lugar: 'tuberia', x0: 158, y0: 20, x1: 192, y1: 165, px: 182, py: 208 },
  { lugar: 'cama', x0: 20, y0: 128, x1: 166, y1: 190, px: 115, py: 214 },
  { lugar: 'bolsas', x0: 6, y0: 200, x1: 74, y1: 262, px: 84, py: 240 },
];

const SUELO = { x0: 22, x1: 458, y0: 196, y1: 262 };

/** Objetos del suelo que se pueden recoger una vez al día. */
const RECOGIBLES = [
  { id: 'lata', x: 92, y: 240, monedas: 3 },
  { id: 'moneda', x: 214, y: 252, monedas: 5 },
];

const VELOCIDAD = 70; // píxeles del mundo por segundo

class Rupert {
  spr: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  private destino: { x: number; y: number } | null = null;
  private alLlegar: (() => void) | null = null;
  ocupado = false;
  etapa = 0;
  /** Quieto en un solo cuadro: la respiración se hace estirando 1 píxel, no cambiando de dibujo. */
  private quieto = false;
  private respiro = 0;
  /** Dónde está acostado durante la siesta (solo si hay dibujo de Rupert durmiendo). */
  private acostado: { x: number; y: number } | null = null;

  constructor(private esc: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.spr = esc.add.sprite(x * E, y * E, this.clave('quieto_frente')).setOrigin(0.5, 1);
    this.reposo();
    this.colocar();
  }

  clave(n: string): string {
    const disponibles = ETAPAS_CON_SPRITES.filter((s) => s <= this.etapa);
    return `e${Math.max(...disponibles)}_${n}`;
  }

  private colocar(): void {
    const t = (this.y - SUELO.y0) / (SUELO.y1 - SUELO.y0);
    const s = E * (0.86 + 0.14 * t);
    // Respiración suave: el cuerpo crece menos del 1 % (un píxel) en un ciclo de 3,2 s.
    const pecho = this.quieto ? 1 + 0.009 * Math.sin((this.respiro / 3200) * Math.PI * 2) : 1;
    this.spr.setPosition(this.x * E, this.y * E).setScale(s, s * pecho).setDepth(this.y);
  }

  reposo(): void {
    if (this.ocupado || this.destino) return;
    this.spr.setFlipX(false);
    if (estaTriste(juego.e)) {
      this.quieto = false;
      if (this.spr.anims.currentAnim?.key !== this.clave('triste') || !this.spr.anims.isPlaying) this.spr.play(this.clave('triste'));
    } else if (!this.quieto || this.spr.texture.key !== this.clave('quieto_frente')) {
      this.quieto = true;
      this.spr.anims.stop();
      this.spr.setTexture(this.clave('quieto_frente'), 0);
    }
    this.colocar();
  }

  private mover(n: string): void {
    this.quieto = false;
    if (this.spr.anims.currentAnim?.key !== this.clave(n) || !this.spr.anims.isPlaying) this.spr.play(this.clave(n));
  }

  /** Siesta: si hay dibujo de Rupert durmiendo se muestra sobre la cama; si no, se tapa con la manta. */
  dormir(x: number, y: number): void {
    this.destino = null;
    this.ocupado = true;
    this.quieto = false;
    const clave = this.clave('dormir');
    if (this.esc.anims.exists(clave)) {
      this.acostado = { x, y };
      this.spr.setFlipX(false).setPosition(x * E, y * E).setDepth(y).play(clave);
    } else {
      this.esc.tweens.add({ targets: this.spr, alpha: 0, duration: 500 });
    }
  }

  despertar(): void {
    this.acostado = null;
    this.esc.tweens.killTweensOf(this.spr);
    this.spr.setAlpha(1);
    this.ocupado = false;
    this.reposo();
  }

  irA(x: number, y: number, alLlegar?: () => void): void {
    if (this.ocupado) return;
    this.destino = { x: Phaser.Math.Clamp(x, SUELO.x0, SUELO.x1), y: Phaser.Math.Clamp(y, SUELO.y0, SUELO.y1) };
    this.alLlegar = alLlegar ?? null;
  }

  hacer(n: string, alTerminar?: () => void, objeto?: string): void {
    this.destino = null;
    this.ocupado = true;
    this.spr.setFlipX(false);
    this.quieto = false;
    if (!this.esc.anims.exists(this.clave(n))) {
      // Etapa sin dibujo para esta acción: Rupert muestra el objeto en la mano y lo comenta.
      this.spr.play(this.clave('hablar'));
      const b = this.spr.getBounds();
      const img = objeto ? this.esc.add.image(b.centerX, b.top + b.height * 0.42, objeto).setScale(E * 0.9).setDepth(this.y + 1) : null;
      if (img) this.esc.tweens.add({ targets: img, y: img.y - 3 * E, duration: 250, yoyo: true, repeat: 2 });
      this.esc.time.delayedCall(1500, () => {
        img?.destroy();
        this.spr.anims.stop();
        this.ocupado = false;
        this.reposo();
        alTerminar?.();
      });
      return;
    }
    this.spr.play(this.clave(n));
    this.spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.ocupado = false;
      this.reposo();
      alTerminar?.();
    });
  }

  hablar(ms: number): void {
    if (this.ocupado || this.destino) return;
    this.quieto = false;
    this.spr.play(this.clave('hablar'));
    this.esc.time.delayedCall(ms, () => {
      if (this.spr.anims.currentAnim?.key === this.clave('hablar')) {
        this.spr.anims.stop();
        this.reposo();
      }
    });
  }

  update(dt: number): void {
    this.respiro += dt;
    if (this.acostado) {
      // Dormido respira más lento y un poco más hondo.
      const pecho = 1 + 0.015 * Math.sin((this.respiro / 4200) * Math.PI * 2);
      this.spr.setScale(E, E * pecho);
      return;
    }
    if (!this.destino) {
      if (this.quieto) this.colocar();
      return;
    }
    const dx = this.destino.x - this.x;
    const dy = this.destino.y - this.y;
    const dist = Math.hypot(dx, dy);
    const paso = (VELOCIDAD * dt) / 1000;
    if (dist <= paso) {
      this.x = this.destino.x;
      this.y = this.destino.y;
      this.destino = null;
      this.colocar();
      this.reposo();
      const cb = this.alLlegar;
      this.alLlegar = null;
      cb?.();
      return;
    }
    this.x += (dx / dist) * paso;
    this.y += (dy / dist) * paso;
    const lateral = Math.abs(dx) > Math.abs(dy) * 0.6;
    const n = lateral ? 'caminar_perfil' : dy > 0 ? 'caminar_frente' : 'caminar_espalda';
    this.mover(n);
    this.spr.setFlipX(lateral && dx < 0);
    this.colocar();
  }
}

export class Callejon extends Phaser.Scene {
  private rupert!: Rupert;
  private fondo!: Phaser.GameObjects.Image;
  private menu: Phaser.GameObjects.Container | null = null;
  private globo: Phaser.GameObjects.Text | null = null;
  private globoHasta = 0;
  private hud!: {
    barras: Phaser.GameObjects.Graphics;
    monedas: Phaser.GameObjects.Text;
    fondo: Phaser.GameObjects.Graphics;
    fondoTexto: Phaser.GameObjects.Text;
    etapa: Phaser.GameObjects.Text;
  };
  private recogibles = new Map<string, Phaser.GameObjects.Image>();
  private reloj = 0;
  /** Tiempo de la escena contado desde create(). */
  private tiempo = 0;
  private panelAbierto = false;
  private siestaActiva = false;
  private despertarSiesta: (() => void) | null = null;

  constructor() {
    super('Callejon');
  }

  create(): void {
    // La escena se reutiliza al volver del minijuego: se reinicia su estado.
    this.recogibles = new Map();
    this.menu = null;
    this.globo = null;
    this.panelAbierto = false;
    this.siestaActiva = false;
    this.despertarSiesta = null;
    this.reloj = 0;
    this.tiempo = 0;
    const e = juego.e;
    this.fondo = this.add.image(0, 0, this.claveFondo()).setOrigin(0).setScale(E).setDepth(-10);
    this.add.image(0, 0, 'callejon_frente').setOrigin(0).setScale(E).setDepth(1000);
    this.rupert = new Rupert(this, 240, 232);
    this.rupert.etapa = e.etapa;
    this.rupert.reposo();
    this.crearRecogibles();
    this.crearHud();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tocar(p.x / E, p.y / E));

    const { dia, subioEtapa } = paso();
    if (dia.nuevoDia && e.racha > 1) this.decir(`¡Volviste! Racha de ${e.racha} días: te guardé ${dia.regalo} monedas.`);
    else if (dia.nuevoDia) this.decir(`¡Hola! Encontré ${dia.regalo} monedas en el bolsillo. Son tuyas.`);
    else this.decir(this.charlaSegunEstado());
    if (subioEtapa) this.subirEtapa();
    this.refrescarHud();
  }

  private claveFondo(): string {
    return juego.e.etapa >= 1 ? 'callejon_e1' : 'callejon_e0';
  }

  // ---------- Entrada ----------

  private tocar(x: number, y: number): void {
    if (this.siestaActiva) {
      this.despertarSiesta?.();
      return;
    }
    if (this.panelAbierto) return;
    if (this.menu) {
      this.cerrarMenu();
      return;
    }
    if (y < 26) return; // franja del HUD
    // ¿Tocó a Rupert?
    const b = this.rupert.spr.getBounds();
    if (b.contains(x * E, y * E)) {
      this.abrirMenu('rupert', x, y);
      return;
    }
    for (const [id, img] of this.recogibles) {
      if (img.getBounds().contains(x * E, y * E)) {
        this.irARecoger(id);
        return;
      }
    }
    const z = ZONAS.find((zz) => x >= zz.x0 && x <= zz.x1 && y >= zz.y0 && y <= zz.y1);
    if (z) {
      this.abrirMenu(z.lugar, x, y);
      return;
    }
    if (y >= SUELO.y0 - 12) this.rupert.irA(x, y);
  }

  private abrirMenu(lugar: Lugar, x: number, y: number): void {
    const verbos: [string, () => void][] = [
      ['Mirar', () => this.mirar(lugar)],
      ['Usar', () => this.usarLugar(lugar)],
    ];
    if (lugar === 'rupert') verbos.push(['Hablar', () => this.hablar()]);
    const w = verbos.length * 48 + 8;
    const mx = Phaser.Math.Clamp(x - w / 2, 4, ANCHO - w - 4);
    const my = Phaser.Math.Clamp(y - 34, 28, ALTO - 44);
    const cont = this.add.container(0, 0).setDepth(2700);
    const g = this.add.graphics();
    caja(g, mx, my, w, 38, COLOR.panel);
    cont.add(g);
    cont.add(texto(this, mx + w / 2, my + 2, NOMBRES[lugar], { tam: 10, color: COLOR.oro }).setOrigin(0.5, 0));
    verbos.forEach(([s, f], i) => {
      cont.add(
        boton(this, mx + 4 + i * 48, my + 15, 44, 19, s, () => {
          this.cerrarMenu();
          f();
        }, 10).cont,
      );
    });
    this.menu = cont;
  }

  private cerrarMenu(): void {
    this.menu?.destroy();
    this.menu = null;
  }

  // ---------- Verbos ----------

  private mirar(lugar: Lugar): void {
    this.decir(al(MIRAR[lugar]));
  }

  private usarLugar(lugar: Lugar): void {
    if (lugar === 'rupert') {
      this.decir('¿Usarme? Prefiero que me des una mano con el fondo.');
      return;
    }
    const z = ZONAS.find((zz) => zz.lugar === lugar)!;
    this.rupert.irA(z.px, z.py, () => {
      const changa = ({ contenedor: 'basura', bolsas: 'reciclaje', tarima: 'collares', tuberia: 'ratones', puerta: 'platos' } as Partial<Record<Lugar, string>>)[lugar];
      if (changa && estadoMinijuego(MINIJUEGOS.find((m) => m.id === changa)!, juego.e.etapa) === 'disponible') {
        this.rupert.hacer('usar', () => this.jugar(changa));
      } else if (lugar === 'cama') {
        if (descansar(juego.e, Date.now())) {
          this.cambio();
          this.siesta();
        } else {
          const resta = CONFIG.esperaDescansoMs - (Date.now() - juego.e.ultimoDescanso);
          const h = Math.floor(resta / 3_600_000);
          const min = Math.ceil((resta % 3_600_000) / 60_000);
          this.decir(`Todavía no tengo sueño. Podré dormir otra siesta en ${h > 0 ? `${h} h ` : ''}${min} min.`);
        }
      } else {
        this.decir(al(USAR[lugar] ?? ['No pasa nada.']));
      }
    });
  }

  /** Siesta de unos segundos: la escena se oscurece y salen "Z" de la cama. Tocar la pantalla lo despierta. */
  private siesta(): void {
    this.siestaActiva = true;
    this.globo?.destroy();
    this.globo = null;
    this.rupert.dormir(92, 186);
    const noche = this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0a0a2a, 0).setOrigin(0).setDepth(1500);
    this.tweens.add({ targets: noche, fillAlpha: 0.45, duration: 700 });
    const zetas = this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const grande = Math.random() < 0.5;
        const z = texto(this, Phaser.Math.Between(52, 70), 142, grande ? 'Z' : 'z', { tam: grande ? 22 : 16, color: '#cfe3ff' }).setDepth(1600);
        this.tweens.add({ targets: z, x: z.x + 24 * E, y: z.y - 40 * E, alpha: 0, duration: 2200, onComplete: () => z.destroy() });
      },
    });
    const fin = this.time.delayedCall(7000, () => despertar());
    const despertar = () => {
      if (!this.siestaActiva) return;
      this.siestaActiva = false;
      fin.remove();
      zetas.remove();
      this.tweens.add({ targets: noche, fillAlpha: 0, duration: 500, onComplete: () => noche.destroy() });
      this.rupert.despertar();
      this.decir('¡Qué buena siesta! Me siento como nuevo. (+20 ánimo)');
    };
    this.despertarSiesta = despertar;
  }

  private hablar(): void {
    const subio = charlar(juego.e, Date.now());
    this.decir(this.charlaSegunEstado() + (subio ? ' (+5 ánimo)' : ''));
    if (subio) this.cambio();
  }

  private charlaSegunEstado(): string {
    const e = juego.e;
    if (e.hambre < 30) return al(CHARLA_HAMBRE);
    if (e.higiene < 30) return al(CHARLA_SUCIO);
    if (e.animo < 30) return al(CHARLA_TRISTE);
    return al(CHARLA_FELIZ);
  }

  private irARecoger(id: string): void {
    const r = RECOGIBLES.find((rr) => rr.id === id)!;
    this.rupert.irA(r.x + 14, r.y, () => {
      this.rupert.hacer('usar', () => {
        if (recoger(juego.e, id, r.monedas)) {
          this.recogibles.get(id)?.destroy();
          this.recogibles.delete(id);
          this.flotar(`+${r.monedas}`, r.x, r.y - 20, COLOR.oro);
          this.decir(id === 'moneda' ? '¡Una moneda! El día empieza bien.' : 'Una lata. Al reciclaje, ¡y unas monedas!');
          this.cambio();
        }
      });
    });
  }

  // ---------- HUD y paneles ----------

  private crearHud(): void {
    const tira = this.add.graphics().setDepth(3000);
    tira.fillStyle(0x140e1c, 0.75);
    tira.fillRect(0, 0, ANCHO * E, 26 * E);
    const iconos = ['i_hambre', 'i_higiene', 'i_animo'];
    iconos.forEach((ic, i) => this.add.image((10 + i * 50) * E, 13 * E, ic).setScale(E * 0.8).setDepth(3001));
    const barras = this.add.graphics().setDepth(3001);
    this.add.image(240 * E, 12 * E, 'barra_fondo').setScale((E * 170) / 220).setDepth(3001);
    const fondo = this.add.graphics().setDepth(3002);
    const fondoTexto = texto(this, 240, 25, '', { tam: 10, alinear: 'center' }).setOrigin(0.5, 0).setDepth(3003);
    this.add.image(410 * E, 13 * E, 'i_moneda').setScale(E * 0.8).setDepth(3001);
    const monedas = texto(this, 420, 5, '', { tam: 13, color: COLOR.oro }).setDepth(3001);
    const etapa = texto(this, 4, 256, '', { tam: 9, color: '#c9b9a6' }).setDepth(3001);
    this.hud = { barras, monedas, fondo, fondoTexto, etapa };

    const y = 246;
    const botones: [string, () => void][] = [
      ['Changas', () => this.panelChangas()],
      ['Comer', () => this.panelObjetos('Darle de comer', COMIDAS, 'Dar', 'comer')],
      ['Asearse', () => this.panelObjetos('Asearse', ASEO, 'Usar', 'lavarse')],
      ['Tienda', () => this.panelTienda()],
      ['Aportar', () => this.panelAportar()],
    ];
    botones.forEach(([s, f], i) => boton(this, 191 + i * 57, y, 54, 20, s, f).cont.setDepth(3001));
  }

  private refrescarHud(): void {
    const e = juego.e;
    const g = this.hud.barras;
    g.clear();
    [e.hambre, e.higiene, e.animo].forEach((v, i) => {
      const x = 19 + i * 50;
      g.fillStyle(0x000000, 0.6).fillRect(x * E, 9 * E, 28 * E, 7 * E);
      const color = v < 25 ? 0xff6b5b : v < 50 ? 0xffc24b : 0x7fd16b;
      g.fillStyle(color, 1).fillRect((x + 1) * E, 10 * E, 26 * (v / 100) * E, 5 * E);
    });
    this.hud.monedas.setText(String(e.monedas));
    const meta = metaActual(e);
    const f = this.hud.fondo;
    f.clear();
    if (meta) {
      const p = Math.min(1, e.fondo / meta);
      f.fillStyle(0xffb347, 0.85).fillRect((240 - 54) * E, 10 * E, 108 * p * E, 4 * E);
      this.hud.fondoTexto.setText(`Fondo de Rupert: ${Math.floor(e.fondo)} / ${meta} PA`);
    } else {
      this.hud.fondoTexto.setText('¡Rupert cumplió todas las metas!');
    }
    this.hud.etapa.setText(`Etapa ${e.etapa} · prototipo v${__VERSION__}${MODO_PRUEBAS ? ' · MODO PRUEBAS' : ''}`);
  }

  private abrir(): void {
    this.panelAbierto = true;
  }

  private panelObjetos(titulo: string, lista: Objeto[], verbo: string, anim: string): void {
    this.cerrarMenu();
    const e = juego.e;
    const cerrar = panel(
      this,
      titulo,
      lista.map((o) => {
        const a = ARTICULOS[o];
        const efectos = [a.hambre && `hambre +${a.hambre}`, a.higiene && `higiene +${a.higiene}`, a.animo && `ánimo +${a.animo}`].filter(Boolean).join(' · ');
        return {
          icono: o,
          titulo: `${a.nombre} (tienes ${e.inventario[o]})`,
          detalle: efectos,
          accion: verbo,
          activa: e.inventario[o] > 0,
          alPulsar: () => {
            if (!usar(e, o)) return;
            cerrar();
            this.rupert.hacer(anim, () => this.decir(anim === 'comer' ? '¡Riquísimo! Gracias.' : '¡Qué bien se siente estar limpio!'), o);
            this.cambio();
          },
        };
      }),
      lista.every((o) => e.inventario[o] === 0) ? 'No tienes nada. Cómpralo en la Tienda con monedas.' : undefined,
      () => (this.panelAbierto = false),
    );
    this.abrir();
  }

  private jugar(id: string): void {
    const m = MINIJUEGOS.find((mm) => mm.id === id);
    if (!m?.escena) return;
    guardarPartida();
    this.scene.start(m.escena);
  }

  /** Changas del lugar actual; las que vienen se muestran bloqueadas para dar ganas de llenar el fondo. */
  private panelChangas(): void {
    this.cerrarMenu();
    const etapa = juego.e.etapa;
    const lista = catalogo(etapa);
    const ahora = lista.filter((x) => x.estado !== 'bloqueado');
    const proximas = lista.filter((x) => x.estado === 'bloqueado').slice(0, Math.max(1, 6 - ahora.length));
    const cerrar = panel(
      this,
      `Changas · ${LUGARES[lugarDeEtapa(etapa)]}`,
      [...ahora, ...proximas].map(({ m, estado }) => ({
        icono: estado === 'disponible' ? 'i_moneda' : undefined,
        titulo: m.nombre,
        detalle: estado === 'bloqueado' ? `Se desbloquea en la etapa ${m.desde} (${LUGARES[m.lugar]})` : m.descripcion,
        accion: estado === 'disponible' ? 'Jugar' : estado === 'proximamente' ? 'Pronto' : `Etapa ${m.desde}`,
        activa: estado === 'disponible',
        alPulsar: () => {
          cerrar();
          this.jugar(m.id);
        },
      })),
      'Cada lugar donde vive Rupert tiene sus propias changas. También puedes tocar las cosas del callejón.',
      () => (this.panelAbierto = false),
    );
    this.abrir();
  }

  private panelTienda(): void {
    this.cerrarMenu();
    const e = juego.e;
    const cerrar = panel(
      this,
      `Tienda · tienes ${e.monedas} monedas`,
      ([...COMIDAS, ...ASEO] as Objeto[]).map((o) => ({
        icono: o,
        titulo: ARTICULOS[o].nombre,
        detalle: `${ARTICULOS[o].precio} monedas · tienes ${e.inventario[o]}`,
        accion: 'Comprar',
        activa: e.monedas >= ARTICULOS[o].precio,
        alPulsar: () => {
          if (comprar(e, o)) {
            this.cambio();
            cerrar();
            this.panelTienda();
          }
        },
      })),
      'Consigue monedas buscando en el contenedor y recogiendo cosas del suelo.',
      () => (this.panelAbierto = false),
    );
    this.abrir();
  }

  private panelAportar(): void {
    this.cerrarMenu();
    const e = juego.e;
    const disp = puedeAportarPA(e);
    const fila = (pa: number) => ({
      icono: 'i_ayuda',
      titulo: `Aportar ${pa} PA`,
      detalle: `${pa * CONFIG.monedasPorPA} monedas`,
      accion: 'Aportar',
      activa: disp >= pa,
      alPulsar: () => {
        const n = aportar(e, pa);
        if (n > 0) {
          this.flotar(`+${n} PA`, 240, 40, '#ffb347');
          this.decir(n >= 5 ? '¡Gracias! Cada punto me acerca a un baño caliente.' : '¡Gracias por la ayuda!');
          this.cambio();
          const { subioEtapa } = paso();
          if (subioEtapa) this.subirEtapa();
        }
        cerrar();
      },
    });
    const cerrar = panel(
      this,
      'Fondo de Rupert',
      [
        fila(1),
        fila(5),
        fila(10),
        ...(MODO_PRUEBAS
          ? [{
              icono: 'i_ayuda',
              titulo: 'Pruebas: +300 PA al fondo',
              detalle: 'Solo en modo pruebas, sin gastar monedas',
              accion: 'Sumar',
              activa: true,
              alPulsar: () => {
                cerrar();
                e.fondo += 300;
                this.cambio();
                const { subioEtapa } = paso();
                if (subioEtapa) this.subirEtapa();
              },
            }]
          : []),
      ],
      `Hoy puedes aportar ${CONFIG.topeDiarioPA - e.aportadoHoy} PA más con monedas. Llevas ${e.aportado} PA en total. ` +
        'Prototipo: el aporte del resto de jugadores se simula.',
      () => (this.panelAbierto = false),
    );
    this.abrir();
  }

  // ---------- Efectos ----------

  private decir(s: string): void {
    this.globo?.destroy();
    this.globo = texto(this, 0, 0, s, { tam: 11, ancho: 170, alinear: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(2500)
      .setBackgroundColor('#1b1424cc')
      .setPadding(6 * E, 3 * E, 6 * E, 3 * E);
    this.globoHasta = this.tiempo + 2500 + s.length * 45;
    this.rupert.hablar(Math.min(2500, 600 + s.length * 30));
  }

  private flotar(s: string, x: number, y: number, color: string): void {
    const t = texto(this, x, y, s, { tam: 14, color }).setOrigin(0.5).setDepth(2600);
    this.tweens.add({ targets: t, y: (y - 24) * E, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  private crearRecogibles(): void {
    for (const r of RECOGIBLES) {
      if (juego.e.recogidos.includes(r.id)) continue;
      const img = this.add.image(r.x * E, r.y * E, r.id).setOrigin(0.5, 1).setScale(E * 0.7).setDepth(r.y - 1);
      this.recogibles.set(r.id, img);
    }
  }

  private cambio(): void {
    guardarPartida();
    this.refrescarHud();
  }

  private subirEtapa(): void {
    const e = juego.e;
    this.rupert.etapa = e.etapa;
    this.cameras.main.flash(600, 255, 230, 160);
    this.fondo.setTexture(this.claveFondo());
    const hito = HITOS[e.etapa] ?? `Rupert pasó a la etapa ${e.etapa}.`;
    const cartel = texto(this, ANCHO / 2, 70, `¡Meta cumplida!\n${hito}`, { tam: 18, color: COLOR.oro, alinear: 'center', ancho: 400 })
      .setOrigin(0.5)
      .setDepth(2800)
      .setBackgroundColor('#1b1424dd')
      .setPadding(10 * E, 6 * E, 10 * E, 6 * E);
    this.tweens.add({ targets: cartel, alpha: 0, delay: 4000, duration: 800, onComplete: () => cartel.destroy() });
    this.rupert.hacer('celebrar', () => this.decir('¡Gracias a todos los que aportaron! Esto lo logramos entre todos.'));
    this.refrescarHud();
  }

  override update(_t: number, dt: number): void {
    this.tiempo += dt;
    this.rupert.update(dt);
    if (this.globo) {
      this.globo.setPosition(Phaser.Math.Clamp(this.rupert.spr.x, 100 * E, (ANCHO - 100) * E), this.rupert.spr.getBounds().top - 4 * E);
      if (this.tiempo > this.globoHasta) {
        this.globo.destroy();
        this.globo = null;
      }
    }
    this.reloj += dt;
    if (this.reloj > 5000) {
      this.reloj = 0;
      const { subioEtapa } = paso();
      if (subioEtapa) this.subirEtapa();
      this.refrescarHud();
      this.rupert.reposo();
    }
  }
}
