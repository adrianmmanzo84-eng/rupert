import Phaser from 'phaser';
import {
  ARTICULOS, ASEO, COMIDAS, CONFIG, type Objeto, aportar, charlar, comprar, descansar, estaTriste,
  metaActual, puedeAportarPA, recoger, usar,
} from '../core/estado';
import { CHARLA_FELIZ, CHARLA_HAMBRE, CHARLA_SUCIO, CHARLA_TRISTE, HITOS, al } from '../core/textos';
import { MODO_PRUEBAS, guardarPartida, juego, paso } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, caja, panel, texto } from '../ui/ui';
import { LUGARES, MINIJUEGOS, catalogo, estadoMinijuego, lugarDeEtapa } from '../core/minijuegos';
import { type Escenario, VISITAS, type Zona, escenarioDeEtapa, escenarioPorId, fondoDeEtapa } from '../core/lugares';
import { type Hueco, decoracion, paraHueco, ponerDecoracion, quitarDecoracion } from '../core/decoracion';
import { ETAPAS_CON_SPRITES } from './Arranque';

type Suelo = Escenario['suelo'];

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

  constructor(private esc: Phaser.Scene, x: number, y: number, private suelo: Suelo, private tam = 1) {
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
    const t = (this.y - this.suelo.y0) / (this.suelo.y1 - this.suelo.y0);
    const s = E * this.tam * (0.86 + 0.14 * t);
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
  dormir(x: number, y: number): boolean {
    this.destino = null;
    this.ocupado = true;
    this.quieto = false;
    const clave = this.clave('dormir');
    if (this.esc.anims.exists(clave)) {
      this.acostado = { x, y };
      this.spr.setFlipX(false).setPosition(x * E, y * E).setDepth(y).play(clave);
      return true;
    }
    this.esc.tweens.add({ targets: this.spr, alpha: 0, duration: 500 });
    return false;
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
    this.destino = { x: Phaser.Math.Clamp(x, this.suelo.x0, this.suelo.x1), y: Phaser.Math.Clamp(y, this.suelo.y0, this.suelo.y1) };
    this.alLlegar = alLlegar ?? null;
  }

  hacer(n: string, alTerminar?: () => void, objeto?: string): void {
    this.destino = null;
    this.ocupado = true;
    this.spr.setFlipX(false);
    this.quieto = false;
    if (!this.esc.anims.exists(this.clave(n))) {
      // Etapa sin dibujo para esta acción: Rupert muestra el objeto en la mano y lo comenta.
      if (this.esc.anims.exists(this.clave('hablar'))) this.spr.play(this.clave('hablar'));
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
    // Si la etapa no tiene dibujo de hablar, Rupert habla quieto.
    if (!this.esc.anims.exists(this.clave('hablar'))) return;
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
      this.spr.setScale(E * this.tam, E * this.tam * pecho);
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

/** Donde vive Rupert: el escenario cambia con la etapa (callejón, plaza, ciudad, pieza...). */
export class Hogar extends Phaser.Scene {
  private rupert!: Rupert;
  private esc!: Escenario;
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
    super('Hogar');
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
    this.decoracionDibujada = [];
    const e = juego.e;
    this.esc = escenarioPorId(this.registry.get('escenario') as string | undefined, e.etapa);
    this.fondo = this.add.image(0, 0, this.esc.id === escenarioDeEtapa(e.etapa).id ? fondoDeEtapa(e.etapa) : this.esc.fondos[0][1]).setOrigin(0).setScale(E).setDepth(-10);
    if (this.esc.primerPlano) this.add.image(0, 0, this.esc.primerPlano).setOrigin(0).setScale(E).setDepth(1000);
    this.rupert = new Rupert(this, this.esc.inicio.x, this.esc.inicio.y, this.esc.suelo, this.esc.escala ?? 1);
    this.rupert.etapa = e.etapa;
    this.rupert.reposo();
    this.crearRecogibles();
    this.dibujarDecoracion();
    this.escribirTiza();
    this.crearHud();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tocar(p.x / E, p.y / E));

    const { dia, subioEtapa } = paso();
    const mudanza = this.registry.get('mudanza') as string | undefined;
    this.registry.remove('mudanza');
    if (this.registry.get('entrando')) {
      this.registry.remove('entrando');
      this.cameras.main.fadeIn(400);
    }
    const trasVisita = this.registry.get('trasVisita') as boolean | undefined;
    this.registry.remove('trasVisita');
    if (trasVisita) {
      this.cameras.main.fadeIn(500);
      this.decir('¡Gracias a todos los que aportaron! Esto lo logramos entre todos.');
    } else if (mudanza) {
      this.cameras.main.fadeIn(600);
      this.decir(`¡Mi nuevo lugar: ${LUGARES[this.esc.lugar]}! Gracias a todos por ayudarme a llegar aquí.`);
    } else if (dia.nuevoDia && e.racha > 1) this.decir(`¡Volviste! Racha de ${e.racha} días: te guardé ${dia.regalo} monedas.`);
    else if (dia.nuevoDia) this.decir(`¡Hola! Encontré ${dia.regalo} monedas en el bolsillo. Son tuyas.`);
    else this.decir(this.charlaSegunEstado());
    if (subioEtapa) this.subirEtapa();
    this.refrescarHud();
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
      this.abrirMenu(null, x, y);
      return;
    }
    for (const [id, img] of this.recogibles) {
      if (img.getBounds().contains(x * E, y * E)) {
        this.irARecoger(id);
        return;
      }
    }
    const h = this.esc.huecos?.find((hh) => Math.abs(x - hh.x) <= hh.ancho / 2 && y >= hh.y - 34 && y <= hh.y + 6);
    if (h) {
      this.menuHueco(h, x, y);
      return;
    }
    const z = this.esc.zonas.find((zz) => x >= zz.x0 && x <= zz.x1 && y >= zz.y0 && y <= zz.y1);
    if (z) {
      this.abrirMenu(z, x, y);
      return;
    }
    if (y >= this.esc.suelo.y0 - 12) this.rupert.irA(x, y);
  }

  /** Menú Mirar / Usar (y Hablar si se tocó a Rupert, que llega como zona nula). */
  private abrirMenu(zona: Zona | null, x: number, y: number, usarPropio?: () => void): void {
    const verbos: [string, () => void][] = [
      ['Mirar', () => this.mirar(zona)],
      [usarPropio ? 'Decorar' : 'Usar', usarPropio ?? (() => this.usarLugar(zona))],
    ];
    if (!zona) verbos.push(['Hablar', () => this.hablar()]);
    const w = verbos.length * 48 + 8;
    const mx = Phaser.Math.Clamp(x - w / 2, 4, ANCHO - w - 4);
    const my = Phaser.Math.Clamp(y - 34, 28, ALTO - 44);
    const cont = this.add.container(0, 0).setDepth(2700);
    const g = this.add.graphics();
    caja(g, mx, my, w, 38, COLOR.panel);
    cont.add(g);
    cont.add(texto(this, mx + w / 2, my + 2, zona?.nombre ?? 'Rupert', { tam: 10, color: COLOR.oro }).setOrigin(0.5, 0));
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

  /** Botón Atrás del teléfono: cierra el menú de verbos o despierta de la siesta. Devuelve false si no había nada. */
  atras(): boolean {
    if (this.siestaActiva) {
      this.despertarSiesta?.();
      return true;
    }
    if (this.menu) {
      this.cerrarMenu();
      return true;
    }
    return false;
  }

  private cerrarMenu(): void {
    this.menu?.destroy();
    this.menu = null;
  }

  // ---------- Verbos ----------

  private mirar(zona: Zona | null): void {
    this.decir(zona ? al(zona.mirar) : al(['Ese soy yo. Rupert. Desgarbado, pero con estilo.', 'Algún día voy a salir adelante. Con un poco de ayuda.']));
  }

  private usarLugar(zona: Zona | null): void {
    if (!zona) {
      this.decir('¿Usarme? Prefiero que me des una mano con el fondo.');
      return;
    }
    const a = zona.usar;
    this.rupert.irA(zona.px, zona.py, () => {
      if (a.tipo === 'changa') {
        const m = MINIJUEGOS.find((mm) => mm.id === a.id);
        if (m && estadoMinijuego(m, juego.e.etapa) === 'disponible') this.rupert.hacer('usar', () => this.jugar(a.id));
        else this.decir(al(a.siNo ?? ['Ahora no puedo hacer eso aquí.']));
      } else if (a.tipo === 'siesta') {
        if (descansar(juego.e, Date.now())) {
          this.cambio();
          this.siesta(a.x, a.y);
        } else {
          const resta = CONFIG.esperaDescansoMs - (Date.now() - juego.e.ultimoDescanso);
          const h = Math.floor(resta / 3_600_000);
          const min = Math.ceil((resta % 3_600_000) / 60_000);
          this.decir(`Todavía no tengo sueño. Podré dormir otra siesta en ${h > 0 ? `${h} h ` : ''}${min} min.`);
        }
      } else if (a.tipo === 'ir') {
        this.cameras.main.fadeOut(400);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.registry.set('escenario', a.a);
          this.registry.set('entrando', true);
          this.scene.restart();
        });
      } else if (a.tipo === 'tienda') {
        this.panelTienda();
      } else {
        this.decir(al(a.lineas));
      }
    });
  }

  /** Siesta de unos segundos: la escena se oscurece y salen "Z" de la cama. Tocar la pantalla lo despierta. */
  private siesta(sx: number, sy: number): void {
    this.siestaActiva = true;
    this.globo?.destroy();
    this.globo = null;
    const acostado = this.rupert.dormir(sx, sy);
    const noche = this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0a0a2a, 0).setOrigin(0).setDepth(1500);
    this.tweens.add({ targets: noche, fillAlpha: 0.45, duration: 700 });
    const zetas = this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const grande = Math.random() < 0.5;
        // Con el dibujo acostado la cabeza queda a la izquierda; si no, las Z salen del centro.
        const zx = acostado ? sx - 40 + Phaser.Math.Between(0, 18) : sx - 9 + Phaser.Math.Between(0, 18);
        const z = texto(this, zx, sy - 44 * (this.esc.escala ?? 1), grande ? 'Z' : 'z', { tam: grande ? 22 : 16, color: '#cfe3ff' }).setDepth(1600);
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
    // Con casa propia ya no sueña con tenerla.
    const felices = e.etapa >= 9 ? CHARLA_FELIZ.filter((f) => !f.includes('casa con jardín')) : CHARLA_FELIZ;
    return al(felices);
  }

  private irARecoger(id: string): void {
    const r = this.esc.recogibles.find((rr) => rr.id === id)!;
    this.rupert.irA(r.x + 14, r.y, () => {
      this.rupert.hacer('usar', () => {
        if (recoger(juego.e, id, r.monedas)) {
          this.recogibles.get(id)?.destroy();
          this.recogibles.delete(id);
          this.flotar(`+${r.monedas}`, r.x, r.y - 20, COLOR.oro);
          this.decir(r.frase);
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
      'Cada lugar donde vive Rupert tiene sus propias changas. También puedes tocar las cosas del lugar.',
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

  /** Objetos comprados, puestos en sus huecos (estantes, mesadas, mesa, suelo). */
  private decoracionDibujada: Phaser.GameObjects.Image[] = [];

  private dibujarDecoracion(): void {
    this.decoracionDibujada.forEach((i) => i.destroy());
    this.decoracionDibujada = [];
    for (const h of this.esc.huecos ?? []) {
      const d = decoracion(juego.e.casa[h.id] ?? '');
      // Un objeto que quedó en un hueco donde ya no va (partidas viejas) vuelve a guardarse.
      if (!d || !d.donde.includes(h.tipo)) continue;
      const img = this.add.image(h.x * E, h.y * E, d.imagen).setOrigin(0.5, 1).setDepth(h.tipo.startsWith('rincon') ? h.y : -4);
      // Cada objeto tiene su alto real en la escena; se achica si no entra en el hueco.
      const escala = Math.min(d.alto, h.alto) / img.height;
      const final = Math.min(escala, h.ancho / img.width);
      img.setScale(E * final);
      this.decoracionDibujada.push(img);
    }
  }

  private menuHueco(h: Hueco, x: number, y: number): void {
    const puesto = decoracion(juego.e.casa[h.id] ?? '');
    const zona: Zona = {
      id: h.id,
      nombre: h.nombre,
      x0: h.x - h.ancho / 2,
      y0: h.y - 34,
      x1: h.x + h.ancho / 2,
      y1: h.y + 6,
      px: Phaser.Math.Clamp(h.x, this.esc.suelo.x0, this.esc.suelo.x1),
      py: this.esc.suelo.y0 + 10,
      mirar: [puesto ? `${puesto.nombre}. Queda perfecto ahí.` : `${h.nombre}: está vacío. Podría poner algo lindo.`],
      usar: { tipo: 'texto', lineas: [''] },
    };
    this.abrirMenu(zona, x, y, () => this.panelDecorar(h));
  }

  /** Lista de lo que se puede poner en un hueco: lo ya comprado se pone gratis, lo demás se compra. */
  private panelDecorar(h: Hueco, pagina = 0): void {
    this.cerrarMenu();
    const e = juego.e;
    const puesto = e.casa[h.id];
    const opciones = paraHueco(h.tipo, (img) => this.textures.exists(img));
    if (opciones.length === 0 && !puesto) {
      this.decir('Todavía no hay nada lindo para poner aquí. Pronto llegan los electrodomésticos a la tienda.');
      return;
    }
    const filas = opciones.map((d) => {
      const tiene = e.decoraciones.includes(d.id);
      return {
        icono: d.imagen,
        titulo: d.nombre + (puesto === d.id ? ' (puesto)' : ''),
        detalle: tiene ? 'Ya lo tienes: ponerlo es gratis' : `${d.precio} monedas`,
        accion: tiene ? 'Poner' : 'Comprar',
        activa: puesto !== d.id && (tiene || e.monedas >= d.precio),
        alPulsar: () => {
          if (ponerDecoracion(e, h, d.id) !== 'puesto') return;
          cerrar();
          this.cambio();
          this.dibujarDecoracion();
          this.flotar('¡Queda lindo!', h.x, h.y - 30, COLOR.oro);
          this.decir(`¡${d.nombre} en ${h.nombre.toLowerCase()}! Mi casa es cada vez más mía.`);
        },
      };
    });
    if (puesto) {
      filas.unshift({
        icono: decoracion(puesto)?.imagen ?? 'i_moneda',
        titulo: 'Sacar lo que hay',
        detalle: 'Queda guardado para ponerlo en otro lado',
        accion: 'Sacar',
        activa: true,
        alPulsar: () => {
          quitarDecoracion(e, h.id);
          cerrar();
          this.cambio();
          this.dibujarDecoracion();
        },
      });
    }
    // Lo ya comprado va primero; de a 6 filas por página, con una fila para ver más.
    filas.sort((a, b) => Number(b.accion === 'Poner' || b.accion === 'Sacar') - Number(a.accion === 'Poner' || a.accion === 'Sacar'));
    const POR_PAGINA = 6;
    const paginas = Math.ceil(filas.length / POR_PAGINA);
    const visibles = filas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
    if (paginas > 1) {
      visibles.push({
        icono: 'i_ayuda',
        titulo: `Más opciones (${pagina + 1} de ${paginas})`,
        detalle: 'Ver los demás objetos',
        accion: 'Ver más',
        activa: true,
        alPulsar: () => {
          cerrar();
          this.panelDecorar(h, (pagina + 1) % paginas);
        },
      });
    }
    const cerrar = panel(this, `${h.nombre} · tienes ${e.monedas} monedas`, visibles, undefined, () => (this.panelAbierto = false));
    this.abrir();
  }

  /** Texto y trazos de tiza sobre el pizarrón del lugar, si lo tiene. */
  private escribirTiza(): void {
    const t = this.esc.tiza;
    if (!t) return;
    const tiza = '#e6ece0';
    for (const l of t.textos) {
      this.add
        .text(l.x * E, l.y * E, l.s, { fontFamily: '"VT323", monospace', fontSize: `${l.tam * E}px`, color: tiza })
        .setAlpha(0.85)
        .setDepth(-5);
    }
    const g = this.add.graphics().setDepth(-5).setAlpha(0.8);
    g.lineStyle(E, 0xe6ece0, 1);
    for (const tr of t.trazos) {
      g.beginPath();
      g.moveTo(tr[0] * E, tr[1] * E);
      for (let i = 2; i < tr.length; i += 2) g.lineTo(tr[i] * E, tr[i + 1] * E);
      g.strokePath();
    }
  }

  private crearRecogibles(): void {
    for (const r of this.esc.recogibles) {
      if (juego.e.recogidos.includes(r.id)) continue;
      const img = this.add.image(r.x * E, r.y * E, r.imagen).setOrigin(0.5, 1).setScale(E * 0.7 * (this.esc.escala ?? 1)).setDepth(r.y - 1);
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
    const nuevo = escenarioDeEtapa(e.etapa);
    const mudanza = nuevo.lugar !== this.esc.lugar;
    if (!mudanza) this.fondo.setTexture(fondoDeEtapa(e.etapa));
    const hito = HITOS[e.etapa] ?? `Rupert pasó a la etapa ${e.etapa}.`;
    const cartel = texto(this, ANCHO / 2, 70, `¡Meta cumplida!\n${hito}`, { tam: 18, color: COLOR.oro, alinear: 'center', ancho: 400 })
      .setOrigin(0.5)
      .setDepth(2800)
      .setBackgroundColor('#1b1424dd')
      .setPadding(10 * E, 6 * E, 10 * E, 6 * E);
    this.tweens.add({ targets: cartel, alpha: 0, delay: 4000, duration: 800, onComplete: () => cartel.destroy() });
    const visita = VISITAS[e.etapa];
    this.rupert.hacer('celebrar', () => {
      if (visita) {
        // Antes de seguir, Rupert pasa por el lugar del hito (barbería, biblioteca).
        this.time.delayedCall(1200, () => {
          this.cameras.main.fadeOut(600);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            if (mudanza) this.registry.set('mudanza', nuevo.lugar);
            else this.registry.set('trasVisita', true);
            this.registry.remove('escenario');
            this.scene.start('Visita', { etapa: e.etapa });
          });
        });
        return;
      }
      if (!mudanza) {
        this.decir('¡Gracias a todos los que aportaron! Esto lo logramos entre todos.');
        return;
      }
      // Rupert se muda: la escena se vuelve a armar con el escenario nuevo.
      this.decir(`¡Me mudo! Nos vemos en ${LUGARES[nuevo.lugar].toLowerCase() === 'casa propia' ? 'mi casa propia' : `la ${LUGARES[nuevo.lugar].toLowerCase()}`}.`);
      this.time.delayedCall(2600, () => {
        this.cameras.main.fadeOut(600);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.registry.set('mudanza', nuevo.lugar);
          this.registry.remove('escenario');
          this.scene.restart();
        });
      });
    });
    this.refrescarHud();
  }

  override update(_t: number, dt: number): void {
    this.tiempo += dt;
    this.rupert.update(dt);
    if (this.globo) {
      // Encima de la cabeza, pero sin tapar la barra de arriba (HUD y texto del fondo, hasta y = 38).
      const arriba = Math.max(this.rupert.spr.getBounds().top - 4 * E, this.globo.height + 38 * E);
      this.globo.setPosition(Phaser.Math.Clamp(this.rupert.spr.x, 100 * E, (ANCHO - 100) * E), arriba);
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
