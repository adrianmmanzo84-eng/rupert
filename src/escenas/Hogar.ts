import Phaser from 'phaser';
import { musica, sonar, voz } from '../audio/sonido';
import { vibrar } from '../audio/vibrar';
import {
  ARTICULOS, ASEO, COMIDAS, CONFIG, type Objeto, charlar, comprar, descansar, estaTriste,
  metaActual, recoger, usar, type Consejo, consejoPendiente,
} from '../core/estado';
import { nombreBarrio } from '../core/barrios';
import { type PasoTutorial, mostrarTutorial } from './tutorial';
import { CHARLA_FELIZ, CHARLA_HAMBRE, CHARLA_SUCIO, CHARLA_TRISTE, HITOS, al } from '../core/textos';
import { MODO_PRUEBAS, guardarPartida, juego, paso } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, caja, panel, texto } from '../ui/ui';
import { LUGARES, MINIJUEGOS, catalogo, estadoMinijuego, lugarDeEtapa } from '../core/minijuegos';
import { type Ducha, type Escenario, VISITAS, type Zona, duchaDe, escenarioDeEtapa, escenarioPorId, fondoDeEtapa, rectDucha, zonaCaja, zonaDucha } from '../core/lugares';
import { brillo, estallido } from '../ui/efectos';
import { type Hueco, decoracion, paraHueco, ponerDecoracion, quitarDecoracion } from '../core/decoracion';
import { ETAPAS_CON_SPRITES, cuandoCargado } from './Arranque';

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
      // Si una animación tiene a Rupert ocupado (por ejemplo, entrando a la ducha), no se lo recoloca.
      if (this.quieto && !this.ocupado) this.colocar();
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
  /** Ducha pública del escenario (R029) y zonas tocables (la ducha primero). */
  private ducha: Ducha | null = null;
  private zonas: Zona[] = [];
  private bañandose = false;
  private duchaImg: Phaser.GameObjects.Image | null = null;
  private duchaAbierta: Phaser.GameObjects.Image | null = null;
  /** Puerta corrediza (un recorte del dibujo o del fondo) y el interior oscuro que deja ver al abrirse. */
  private panelPuerta: Phaser.GameObjects.Image | null = null;
  private interior: Phaser.GameObjects.Rectangle[] = [];
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
    this.cerrarTutorial = null;
    this.reloj = 0;
    this.tiempo = 0;
    this.decoracionDibujada = [];
    const e = juego.e;
    this.esc = escenarioPorId(this.registry.get('escenario') as string | undefined, e.etapa);
    // Música del lugar (R042).
    const lugar = this.esc.lugar;
    musica(lugar === 'callejon' || lugar === 'plaza' || lugar === 'ciudad' ? lugar : 'interior');
    this.fondo = this.add.image(0, 0, this.esc.id === escenarioDeEtapa(e.etapa).id ? fondoDeEtapa(e.etapa) : this.esc.fondos[0][1]).setOrigin(0).setScale(E).setDepth(-10);
    if (this.esc.primerPlano) this.add.image(0, 0, this.esc.primerPlano).setOrigin(0).setScale(E).setDepth(1000);
    // Ducha pública de la calle (R030): una cabina dibujada o una puerta pintada en el fondo; se puede tocar.
    this.ducha = duchaDe(this.esc, e.etapa);
    this.zonas = this.ducha ? [zonaDucha(this.ducha), ...this.esc.zonas] : this.esc.zonas;
    // Caja de aportes (R040): un objeto del suelo, con un brillito de vez en cuando; abre el fondo del barrio.
    const cj = this.esc.caja;
    if (cj) {
      this.zonas = [zonaCaja(cj), ...this.zonas];
      this.add.image(cj.x * E, cj.y * E, `caja_${cj.alto * E}`).setOrigin(0.5, 1).setDepth(cj.y);
      this.time.addEvent({ delay: 5200, loop: true, callback: () => estallido(this, cj.x * E, (cj.y - cj.alto * 0.7) * E, { textura: 'fx_estrella', colores: [0xffe9a0, 0xffffff], cantidad: 4, velocidad: [15, 45], vida: 600 }) });
    }
    this.bañandose = false;
    this.duchaImg = null;
    this.duchaAbierta = null;
    this.panelPuerta = null;
    this.interior = [];
    if (this.ducha?.imagen) {
      const d = this.ducha;
      const r = rectDucha(d);
      this.duchaImg = this.add.image(r.x0 * E, r.y0 * E, d.imagen!).setOrigin(0).setDepth(d.y);
      this.duchaImg.setScale((d.alto * E) / this.duchaImg.height);
      if (d.abierta) {
        this.duchaAbierta = this.add.image(r.x0 * E, r.y0 * E, d.abierta).setOrigin(0).setDepth(d.y + 0.05).setScale(this.duchaImg.scaleX).setAlpha(0);
      }
    }
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
      this.decir('¡Gracias a todos los que aportaron! Esto lo logramos entre todos. Yo puse la cara de lástima.');
    } else if (mudanza) {
      this.cameras.main.fadeIn(600);
      this.decir(`¡Mi nuevo lugar: ${LUGARES[this.esc.lugar]}! Gracias por ayudarme a llegar. Prometo no arruinarlo. Por lo menos, no hoy.`);
    } else if (dia.nuevoDia && e.racha > 1) this.decir(`¡Volviste! Racha de ${e.racha} días: te guardé ${dia.regalo} monedas. Casi me las gasto, pero me contuve. Casi.`);
    else if (dia.nuevoDia) this.decir(`¡Hola! Encontré ${dia.regalo} monedas en el bolsillo. Son tuyas. Hasta me sorprendió tener bolsillo.`);
    else this.decir(this.charlaSegunEstado());
    // También celebra si la meta se llenó desde la pantalla del fondo (aporte o compra).
    if (subioEtapa || juego.subioPendiente) this.subirEtapa();
    juego.subioPendiente = false;
    this.refrescarHud();
    // El servidor avisa cambios del barrio (aportes de los vecinos, meta cumplida).
    const alBarrio = () => {
      if (juego.subioPendiente && !this.panelAbierto && !this.siestaActiva) {
        juego.subioPendiente = false;
        this.subirEtapa();
      }
      this.refrescarHud();
    };
    this.game.events.on('barrio', alBarrio);
    this.events.once('shutdown', () => this.game.events.off('barrio', alBarrio));
    if (!e.tutorial && !mudanza && !trasVisita) this.time.delayedCall(700, () => this.iniciarTutorial());
    else this.time.delayedCall(4500, () => this.revisarConsejo());
  }

  private cerrarTutorial: (() => void) | null = null;

  /** Tutorial de comandos (R024): explica las barras, el fondo, cómo explorar y cada botón. */
  private iniciarTutorial(): void {
    if (this.cerrarTutorial) return;
    this.cerrarMenu();
    this.panelAbierto = true;
    const b = this.rupert.spr.getBounds();
    const zonaRupert = { x0: b.x / E, y0: b.y / E, x1: (b.x + b.width) / E, y1: (b.y + b.height) / E };
    const z = this.esc.zonas.find((zz) => zz.usar.tipo === 'changa') ?? this.esc.zonas[0];
    // Tutorial corto (R042): tres pasos y a jugar. El resto se explica cuando aparece (consejos).
    const pasos: PasoTutorial[] = [
      { titulo: '¡Hola! Soy Rupert', texto: 'Las cosas no me vienen saliendo muy bien. Ni mal: directamente no me vienen. Con tu ayuda y la de los vecinos voy a salir adelante.', zona: zonaRupert },
      { titulo: 'Caminar y explorar', texto: `Toca el suelo y camino hasta ahí. Toca las cosas, como «${z?.nombre ?? 'el contenedor'}»: «Mirar» te cuenta algo y «Usar» a veces empieza una changa, que es como gano monedas.`, zona: z ? { x0: z.x0, y0: z.y0, x1: z.x1, y1: z.y1 } : undefined },
      { titulo: 'Changas', texto: 'O directamente acá: «Changas» tiene todos los trabajos del lugar. Vamos a ganar unas monedas. Lo demás te lo cuento sobre la marcha.', zona: { x0: 188, y0: 244, x1: 252, y1: 268 } },
    ];
    this.cerrarTutorial = mostrarTutorial(this, pasos, () => {
      this.cerrarTutorial = null;
      this.panelAbierto = false;
      juego.e.tutorial = true;
      guardarPartida();
      this.decir('¡Vamos! Empecemos por ganar unas monedas. Y por no morirnos de hambre, que es un buen comienzo.');
    });
  }

  /** Consejo en contexto (R042): la primera vez que algo hace falta, Rupert lo explica señalándolo. */
  private revisarConsejo(): void {
    const e = juego.e;
    if (!e.tutorial || this.cerrarTutorial || this.panelAbierto || this.menu || this.siestaActiva || this.bañandose || this.rupert.ocupado) return;
    const c = consejoPendiente(e);
    if (!c) return;
    const b = this.rupert.spr.getBounds();
    const zonaRupert = { x0: b.x / E, y0: b.y / E, x1: (b.x + b.width) / E, y1: (b.y + b.height) / E };
    const PASOS: Record<Consejo, PasoTutorial> = {
      necesidades: { titulo: 'Mis necesidades', texto: 'Hambre, higiene y ánimo bajan con el tiempo, aunque no estés jugando: es lo único mío que baja sin esfuerzo. Si están altas rindo más en las changas y gano más monedas.', zona: { x0: 0, y0: 0, x1: 160, y1: 26 } },
      tienda: { titulo: 'La tienda', texto: 'No tengo nada para comer. En «Tienda» se compra comida y jabón con monedas; después se usan con «Comer» y «Asearse». Dignidad no venden. Ya pregunté.', zona: { x0: 360, y0: 244, x1: 420, y1: 268 } },
      fondo: { titulo: 'El fondo del barrio', texto: 'Ya juntaste monedas. Con «Aportar» (o tocando la cajita del corazón) van al fondo del barrio. Cuando la barra de arriba se llena entre todos, cumplo una meta y mi vida mejora.', zona: { x0: 150, y0: 0, x1: 330, y1: 36 } },
      hablar: { titulo: 'Hablar conmigo', texto: 'Ando medio bajoneado. Tócame y elige «Hablar»: charlar un rato me levanta el ánimo. Hace semanas que nadie me habla, así que no seas tímido.', zona: zonaRupert },
      menu: { titulo: 'Menú y pausa', texto: '«Menú» vuelve a la pantalla principal: ahí están los Ajustes, el sonido y este tutorial. En las changas, el botón II pausa el juego. Ojalá la vida tuviera uno.', zona: { x0: 2, y0: 244, x1: 50, y1: 268 } },
    };
    this.panelAbierto = true;
    this.cerrarTutorial = mostrarTutorial(this, [PASOS[c]], () => {
      this.cerrarTutorial = null;
      this.panelAbierto = false;
      if (!e.consejos.includes(c)) e.consejos.push(c);
      guardarPartida();
    });
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
    const z = this.zonas.find((zz) => x >= zz.x0 && x <= zz.x1 && y >= zz.y0 && y <= zz.y1);
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

  /** Vuelve a la pantalla de título (guarda antes). */
  irAlTitulo(): void {
    guardarPartida();
    this.scene.start('Titulo');
  }

  /** Botón Atrás del teléfono: cierra el menú de verbos o despierta de la siesta. Devuelve false si no había nada. */
  atras(): boolean {
    if (this.cerrarTutorial) {
      this.cerrarTutorial();
      return true;
    }
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
    this.decir(zona ? al(zona.mirar) : al(['Ese soy yo. Rupert. Desgarbado, pero con estilo. Principalmente desgarbado.', 'Algún día voy a salir adelante. Con un poco de ayuda. Y bastante suerte. Y un milagro chico.']));
  }

  private usarLugar(zona: Zona | null): void {
    if (!zona) {
      this.decir('¿Usarme? Nadie me pidió eso nunca. Prefiero que me des una mano con el fondo.');
      return;
    }
    const a = zona.usar;
    this.rupert.irA(zona.px, zona.py, () => {
      if (a.tipo === 'changa') {
        const m = MINIJUEGOS.find((mm) => mm.id === a.id);
        if (m && estadoMinijuego(m, juego.e.etapa) === 'disponible') this.rupert.hacer('usar', () => this.jugar(a.id));
        else this.decir(al(a.siNo ?? ['Ahora no puedo hacer eso aquí. Me falta talento. O lugar. O las dos cosas.']));
      } else if (a.tipo === 'siesta') {
        if (descansar(juego.e, Date.now())) {
          this.cambio();
          this.siesta(a.x, a.y);
        } else {
          const resta = CONFIG.esperaDescansoMs - (Date.now() - juego.e.ultimoDescanso);
          const h = Math.floor(resta / 3_600_000);
          const min = Math.ceil((resta % 3_600_000) / 60_000);
          this.decir(`Todavía no tengo sueño, y dormir sin sueño es una disciplina que no domino. Otra siesta en ${h > 0 ? `${h} h ` : ''}${min} min.`);
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
      } else if (a.tipo === 'ducha') {
        this.panelDucha();
      } else if (a.tipo === 'fondo') {
        this.scene.start('Fondo', { volver: 'Hogar' });
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
      this.decir('¡Qué buena siesta! Soñé que tenía plata. Qué crueldad, la del cerebro. (+20 ánimo)');
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
          sonar('moneda');
          vibrar('suave');
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
    const etapa = texto(this, 4, 234, '', { tam: 9, color: '#c9b9a6' }).setDepth(3001);
    this.hud = { barras, monedas, fondo, fondoTexto, etapa };

    const y = 246;
    const botones: [string, () => void][] = [
      ['Changas', () => this.panelChangas()],
      ['Comer', () => this.panelObjetos('Darle de comer', COMIDAS, 'Dar', 'comer')],
      ['Asearse', () => this.asearse()],
      ['Tienda', () => this.panelTienda()],
      ['Aportar', () => this.scene.start('Fondo', { volver: 'Hogar' })],
    ];
    botones.forEach(([s, f], i) => boton(this, 191 + i * 57, y, 54, 20, s, f).cont.setDepth(3001));
    boton(this, 4, y, 44, 20, 'Menú', () => this.irAlTitulo()).cont.setDepth(3001);
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
      this.hud.fondoTexto.setText(`${nombreBarrio(e.barrio)}: ${Math.floor(e.fondo)} / ${meta} PA`);
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
            sonar(anim === 'comer' ? 'comer' : 'agua');
            this.rupert.hacer(anim, () => this.decir(anim === 'comer' ? '¡Riquísimo! Gracias. Comí tan rápido que no me enteré. Entrenamiento de años.' : '¡Qué bien se siente estar limpio! Había olvidado esta sensación. Es rara.'), o);
            this.cambio();
          },
        };
      }),
      lista.every((o) => e.inventario[o] === 0) ? 'No tienes nada. Cómpralo en la Tienda con monedas.' : undefined,
      () => (this.panelAbierto = false),
    );
    this.abrir();
  }

  /** Botón «Asearse»: en la calle, Rupert va a la ducha pública; en otros lugares se asea donde está. */
  private asearse(): void {
    this.cerrarMenu();
    if (!this.ducha) {
      this.panelObjetos('Asearse', ASEO, 'Usar', 'lavarse');
      return;
    }
    if (this.rupert.ocupado || this.bañandose) return;
    this.rupert.irA(this.ducha.px, this.ducha.py, () => this.panelDucha());
  }

  /** Elegir con qué bañarse en la ducha pública. */
  private panelDucha(): void {
    this.cerrarMenu();
    const e = juego.e;
    const cerrar = panel(
      this,
      'Ducha pública',
      ASEO.map((o) => {
        const a = ARTICULOS[o];
        const efectos = [a.higiene && `higiene +${a.higiene}`, a.animo && `ánimo +${a.animo}`].filter(Boolean).join(' · ');
        return {
          icono: o,
          titulo: `${a.nombre} (tienes ${e.inventario[o]})`,
          detalle: efectos,
          accion: 'Bañarse',
          activa: e.inventario[o] > 0,
          alPulsar: () => {
            if (!usar(e, o)) return;
            cerrar();
            this.cambio();
            this.bañarse(o);
          },
        };
      }),
      ASEO.every((o) => e.inventario[o] === 0) ? 'No tienes jabón ni shampoo. Cómpralos en la Tienda.' : 'Elige con qué bañarte.',
      () => (this.panelAbierto = false),
    );
    this.abrir();
  }

  /**
   * Rupert entra a la ducha, la puerta se cierra, sale vapor y espuma, y sale limpio (R029, R030).
   * Se anima directamente mientras Rupert está «ocupado».
   */
  private bañarse(o: string): void {
    const d = this.ducha;
    if (!d) return;
    const r = rectDucha(d);
    const ab = r.abertura;
    const spr = this.rupert.spr;
    this.bañandose = true;
    this.rupert.ocupado = true;
    this.globo?.destroy();
    this.globo = null;
    const antes = { x: spr.x, y: spr.y, sx: spr.scaleX, sy: spr.scaleY, depth: spr.depth };
    // Dentro de la abertura Rupert se achica hasta entrar: de ancho (sus hombros miden unos 3/4 de su alto) y sin pasar del alto.
    const alto = spr.displayHeight / spr.scaleY;
    const altoDentro = Math.min((ab.y1 - ab.y0) * 0.92, ((ab.x1 - ab.x0) * 1.15) / 0.74);
    const escala = (altoDentro * E) / alto;
    const entrada = { x: ((ab.x0 + ab.x1) / 2) * E, y: (ab.y1 - 1) * E };
    const espalda = this.rupert.clave('caminar_espalda');
    spr.setFlipX(false);
    this.prepararPuerta();
    this.abrirPuerta(() => {
      if (this.anims.exists(espalda)) spr.play(espalda);
      this.tweens.add({
        targets: spr, x: entrada.x, y: entrada.y, scaleX: escala, scaleY: escala, duration: 650, ease: 'Sine.easeInOut',
        onUpdate: (t) => t.progress > 0.5 && spr.setDepth(d.y + 0.1),
        onComplete: () => {
          spr.anims.stop();
          this.cerrarPuerta(() => {
            spr.setAlpha(0);
            sonar('agua');
            this.vapor(r, ab, d.y, 2200, () => {
              spr.setTexture(this.rupert.clave('quieto_frente'), 0).setAlpha(1);
              this.abrirPuerta(() => {
                const frente = this.rupert.clave('caminar_frente');
                if (this.anims.exists(frente)) spr.play(frente);
                this.tweens.add({
                  targets: spr, x: antes.x, y: antes.y, scaleX: antes.sx, scaleY: antes.sy, duration: 600, ease: 'Sine.easeInOut',
                  onUpdate: (t) => t.progress > 0.5 && spr.setDepth(antes.depth),
                  onComplete: () => {
                    spr.anims.stop();
                    this.rupert.ocupado = false;
                    this.bañandose = false;
                    this.rupert.reposo();
                    // La puerta se cierra sola mientras Rupert ya puede seguir.
                    this.cerrarPuerta(() => this.quitarPuerta());
                    const b = spr.getBounds();
                    brillo(this, b.centerX - 14 * E, b.top + 20 * E, [0xffffff, 0x9fd4ff, 0xffe9a0]);
                    brillo(this, b.centerX + 14 * E, b.top + 40 * E, [0xffffff, 0x9fd4ff, 0xffe9a0]);
                    this.decir(o === 'shampoo' ? '¡Pelo limpio y perfumado! Me siento otro. Hasta me reconozco menos.' : o === 'toalla' ? 'Una secada con toalla limpia. ¡Qué lujo! Me siento faraón. Un faraón con frío.' : '¡Como nuevo! Hasta el olor a contenedor se fue. Casi lo extraño: era mi perfume de firma.');
                  },
                });
              });
            });
          });
        },
      });
    });
  }

  /**
   * Prepara la puerta de la ducha. Si hay un dibujo con la puerta abierta no hace falta nada; si no, se recorta
   * la puerta del dibujo cerrado (o del fondo) para deslizarla y se pone un interior oscuro detrás.
   */
  private prepararPuerta(): void {
    const d = this.ducha;
    if (!d || this.duchaAbierta) return;
    const r = rectDucha(d);
    const ab = r.abertura;
    const base = d.puerta ? this.fondo : this.duchaImg;
    if (!base) return;
    // Píxeles de la textura por px del mundo, y de dónde sale el recorte (el fondo empieza en 0,0; la cabina, en su esquina).
    const escalaBase = base.scaleX;
    const tpp = E / escalaBase;
    const ox = d.puerta ? 0 : r.x0;
    const oy = d.puerta ? 0 : r.y0;
    const sx = Math.round((ab.x0 - ox) * tpp);
    const sy = Math.round((ab.y0 - oy) * tpp);
    const sw = Math.max(1, Math.round((ab.x1 - ab.x0) * tpp));
    const sh = Math.max(1, Math.round((ab.y1 - ab.y0) * tpp));
    const clave = 'ducha_panel';
    if (this.textures.exists(clave)) this.textures.remove(clave);
    const lienzo = this.textures.createCanvas(clave, sw, sh);
    if (!lienzo) return;
    lienzo.context.imageSmoothingEnabled = false;
    lienzo.context.drawImage(base.texture.getSourceImage() as CanvasImageSource, sx, sy, sw, sh, 0, 0, sw, sh);
    lienzo.refresh();
    const w = (ab.x1 - ab.x0) * E;
    const h = (ab.y1 - ab.y0) * E;
    // Interior: más claro arriba (entra luz por el techo) y oscuro abajo.
    const bandas: [number, number, number][] = [[0x6b5330, 0, 0.22], [0x45351f, 0.22, 0.5], [0x2b2118, 0.5, 1]];
    this.interior = bandas.map(([color, desde, hasta]) =>
      this.add.rectangle(ab.x0 * E, ab.y0 * E + h * desde, w, h * (hasta - desde) + 1, color).setOrigin(0).setDepth(d.y + 0.03),
    );
    this.interior.forEach((b) => b.setVisible(false));
    // La puerta se pega al borde derecho y se desliza hacia él al abrirse.
    this.panelPuerta = this.add.image(ab.x1 * E, ab.y0 * E, clave).setOrigin(1, 0).setScale(escalaBase).setDepth(d.y + 0.2);
  }

  private quitarPuerta(): void {
    this.panelPuerta?.destroy();
    this.panelPuerta = null;
    this.interior.forEach((b) => b.destroy());
    this.interior = [];
    if (this.textures.exists('ducha_panel')) this.textures.remove('ducha_panel');
  }

  /** Abre la puerta: cambia al dibujo abierto (plaza) o desliza el panel dejando ver el interior. */
  private abrirPuerta(listo: () => void): void {
    sonar('puerta');
    if (this.duchaAbierta) {
      this.tweens.add({ targets: this.duchaAbierta, alpha: 1, duration: 160, onComplete: listo });
      return;
    }
    const p = this.panelPuerta;
    if (!p) return listo();
    this.interior.forEach((b) => b.setVisible(true));
    this.tweens.add({ targets: p, scaleX: 0, duration: 300, ease: 'Quad.easeIn', onComplete: listo });
  }

  /** Cierra la puerta con un golpecito. */
  private cerrarPuerta(listo: () => void): void {
    const golpe = () => {
      this.cameras.main.shake(70, 0.002);
      listo();
    };
    if (this.duchaAbierta) {
      this.tweens.add({ targets: this.duchaAbierta, alpha: 0, duration: 140, onComplete: golpe });
      return;
    }
    const p = this.panelPuerta;
    if (!p) return listo();
    this.tweens.add({
      targets: p, scaleX: this.duchaImg?.scaleX ?? E, duration: 320, ease: 'Quad.easeOut',
      onComplete: () => {
        this.interior.forEach((b) => b.setVisible(false));
        golpe();
      },
    });
  }

  /** La cabina tiembla un poquito (alguien se está fregando con ganas). */
  private temblar(): void {
    const t = this.panelPuerta ?? this.duchaImg;
    if (t) this.tweens.add({ targets: t, x: t.x + E, duration: 50, yoyo: true });
  }

  /** Mientras se baña: vapor que sube del techo, espuma, gotas y una canción. */
  private vapor(r: { x0: number; y0: number; x1: number }, ab: { x0: number; y0: number; x1: number; y1: number }, prof: number, ms: number, listo: () => void): void {
    const cx = ((r.x0 + r.x1) / 2) * E;
    const ev = this.time.addEvent({
      delay: 140, loop: true,
      callback: () => {
        // Vapor que sube por arriba de la cabina.
        const v = this.add.circle(cx + Phaser.Math.Between(-10, 10) * E, (r.y0 + 4) * E, Phaser.Math.Between(3, 6) * E, 0xffffff, 0.5).setDepth(prof + 0.3);
        this.tweens.add({ targets: v, y: v.y - Phaser.Math.Between(18, 34) * E, x: v.x + Phaser.Math.Between(-8, 8) * E, scale: 2, alpha: 0, duration: 1100, onComplete: () => v.destroy() });
        // Espuma y burbujas que se asoman por la puerta.
        if (Math.random() < 0.6) {
          estallido(this, Phaser.Math.Between(ab.x0 + 3, ab.x1 - 3) * E, (ab.y0 + (ab.y1 - ab.y0) * 0.3) * E, {
            textura: 'fx_burbuja', colores: [0xffffff, 0xcfefff], cantidad: 2, velocidad: [8, 25], vida: 900, gravedad: -40, angulo: [240, 300], escala: 1.3, profundidad: prof + 0.4,
          });
        }
      },
    });
    const temblor = this.time.addEvent({ delay: 420, loop: true, callback: () => this.temblar() });
    const nota = texto(this, (ab.x1 + ab.x0) / 2, ab.y0 - 14, '♪ La la la ♪', { tam: 11, color: '#cfe3ff' }).setOrigin(0.5).setDepth(prof + 0.5);
    this.tweens.add({ targets: nota, y: nota.y - 6 * E, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.delayedCall(ms, () => {
      ev.remove();
      temblor.remove();
      nota.destroy();
      listo();
    });
  }

  private jugar(id: string): void {
    const m = MINIJUEGOS.find((mm) => mm.id === id);
    if (!m?.escena) return;
    guardarPartida();
    cuandoCargado(this, () => this.scene.start(m.escena));
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

  private decir(s: string): void {
    this.globo?.destroy();
    this.globo = texto(this, 0, 0, s, { tam: 11, ancho: 170, alinear: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(2500)
      .setBackgroundColor('#1b1424cc')
      .setPadding(6 * E, 3 * E, 6 * E, 3 * E);
    this.globoHasta = this.tiempo + 2500 + s.length * 45;
    voz(s, estaTriste(juego.e));
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
      mirar: [puesto ? `${puesto.nombre}. Queda perfecto ahí. Tengo ojo de decorador. Y de nada más.` : `${h.nombre}: está vacío. Igual que mi billetera, pero esto tiene arreglo.`],
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
      this.decir('Todavía no hay nada lindo para poner aquí. Pronto llegan los electrodomésticos a la tienda. Ya fantaseo con la heladera.');
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
          this.decir(`¡${d.nombre} en ${h.nombre.toLowerCase()}! Mi casa es cada vez más mía. Y menos de las ratas.`);
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
    sonar('meta');
    vibrar('logro');
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
            cuandoCargado(this, () => this.scene.start('Visita', { etapa: e.etapa }));
          });
        });
        return;
      }
      if (!mudanza) {
        this.decir('¡Gracias a todos los que aportaron! Esto lo logramos entre todos. Yo puse la cara de lástima.');
        if (metaActual(e) === null && !e.finalVisto) this.time.delayedCall(3500, () => cuandoCargado(this, () => this.scene.start('Epilogo', { volver: 'Hogar' })));
        return;
      }
      // Rupert se muda: la escena se vuelve a armar con el escenario nuevo.
      this.decir(`¡Me mudo! Qué rara sensación, la de tener adónde mudarse. Nos vemos en ${LUGARES[nuevo.lugar].toLowerCase() === 'casa propia' ? 'mi casa propia' : `la ${LUGARES[nuevo.lugar].toLowerCase()}`}.`);
      // Con la última meta cumplida, antes de entrar a la casa nueva se cuenta el epílogo (R041).
      const final = metaActual(e) === null && !e.finalVisto;
      this.time.delayedCall(2600, () => {
        this.cameras.main.fadeOut(600);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.registry.set('mudanza', nuevo.lugar);
          this.registry.remove('escenario');
          if (final) cuandoCargado(this, () => this.scene.start('Epilogo', { volver: 'Hogar' }));
          else this.scene.restart();
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
      this.revisarConsejo();
    }
  }
}
