import Phaser from 'phaser';
import { ALTO, ANCHO, E, texto } from '../ui/ui';
import { CHAPAS } from '../core/minijuegos';
import { ARREGLOS, HERRAMIENTAS, INGREDIENTES, PEATONES } from '../core/changas';
import { FONDOS, escenarioDeEtapa, fondoDeEtapa } from '../core/lugares';
import { juego } from '../juego';

export interface Anim {
  w: number;
  h: number;
  n: number;
}

/** Velocidad (fotogramas por segundo) y repetición de cada animación de Rupert. */
export const ANIMS: Record<string, { fps: number; repetir: boolean }> = {
  quieto_frente: { fps: 4, repetir: true },
  quieto_34: { fps: 4, repetir: true },
  caminar_perfil: { fps: 10, repetir: true },
  caminar_frente: { fps: 8, repetir: true },
  caminar_espalda: { fps: 8, repetir: true },
  hablar: { fps: 8, repetir: true },
  comer: { fps: 5, repetir: false },
  lavarse: { fps: 5, repetir: false },
  usar: { fps: 7, repetir: false },
  triste: { fps: 2, repetir: true },
  celebrar: { fps: 10, repetir: false },
  dormir: { fps: 1.5, repetir: true },
};

/** Etapas de Rupert con sprites ya procesados (las demás usan la más alta disponible). */
export const ETAPAS_CON_SPRITES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const OBJETOS = [
  'lata', 'diario', 'zapato', 'llave', 'moneda', 'paraguas',
  'botella', 'botella_plastico', 'cascara', 'espina', 'caja', 'anillo',
  'sandwich', 'sopa', 'manzana', 'jabon', 'shampoo', 'toalla', 'cafe', 'ducha_callejon_0', 'caja_40', 'caja_52', 'caja_64', 'ducha_plaza', 'ducha_plaza_abierta',
  'i_hambre', 'i_higiene', 'i_animo', 'i_moneda', 'i_ayuda', 'i_racha',
  'volantes', 'paloma', 'paloma_vuela', 'billetera', 'caja_herramientas', 'rueda',
  'tijeras', 'peine', 'brocha', 'navaja', 'secador', 'perfume',
  'gorro', 'anteojos', 'monio', 'gorra', 'guantes', 'flor',
  'botella_aplastada', 'vaso_yogur', 'bidon', 'bolsa', 'frasco', 'botella_vino', 'vaso', 'salsa', 'carton', 'maple', 'revistas', 'conserva',
  'reloj', 'autito', 'osito', 'radio', 'auriculares', 'taza', 'patito', 'libro', 'media', 'manzana_podrida', 'pan_moho', 'cucaracha',
  'plato_sucio', 'plato_limpio', 'taza_sucia', 'taza_limpia', 'esponja', 'pila_platos',
  'heladera', 'tele', 'lampara', 'microondas', 'cafetera', 'tostadora', 'planta', 'reloj_pared', 'radiocasete',
];

/** Arte propio de los minijuegos: tachos, ratones (4 colores × 4 fotogramas) y chapitas. */
export const ARTE_MINIJUEGOS = [
  ...['plastico', 'vidrio', 'papel', 'metal'].map((t) => `tacho_${t}`),
  ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((f) => `raton${r}_${f}`)),
  ...CHAPAS.map((c) => `chapa_${c}`),
];

/** Arte de las changas de cocina, arreglos, volantes (v0.10). */
export const ARTE_CHANGAS = [
  'hornillo', 'olla', 'sarten', 'tabla', ...INGREDIENTES, 'plato_arroz', 'plato_fideos', 'plato_guiso',
  ...ARREGLOS.flatMap((a) => [`${a.objeto}_rota`, `${a.objeto}_ok`]), ...HERRAMIENTAS.map((h) => `herr_${h}`),
  'volante',
];

/** Hojas de fotogramas de las changas: celdas del mismo tamaño en una fila. */
export const TIRAS_CHANGAS: { clave: string; w: number; h: number }[] = [
  { clave: 'entrevistador', w: 95, h: 121 },
  ...PEATONES.map((p) => ({ clave: `peaton${p.hoja}`, w: 62, h: 73 })),
];

/**
 * Extensión de las imágenes (R042): en la versión publicada se sirven en WebP (sin pérdida, un 24 % más
 * livianas); el paso `webp` de vite.config.ts las convierte al compilar. En desarrollo se usan los PNG.
 */
export const EXT = import.meta.env.PROD ? 'webp' : 'png';
const img = (ruta: string) => `assets/${ruta}.${EXT}`;

/** Fondos que se ven en el escenario de esta etapa (con el jardín de la casa y el primer plano del callejón). */
function fondosEsenciales(etapa: number): string[] {
  const esc = escenarioDeEtapa(etapa);
  const l = [fondoDeEtapa(etapa)];
  if (esc.lugar === 'casa') l.push('casa');
  return l;
}

/** Pone en cola las tiras de Rupert de las etapas pedidas (las medidas están en anim.json). */
function encolarRupert(esc: Phaser.Scene, meta: Record<string, Anim>, etapas: number[]): string[] {
  const claves = Object.keys(meta).filter((c) => etapas.includes(Number(/^e(\d+)_/.exec(c)?.[1])) && !esc.textures.exists(c));
  for (const c of claves) esc.load.spritesheet(c, img(`rupert/${c}`), { frameWidth: meta[c].w, frameHeight: meta[c].h });
  return claves;
}

/** Crea las animaciones de Rupert de las tiras ya cargadas. */
function crearAnimaciones(esc: Phaser.Scene, claves: string[]): void {
  for (const clave of claves) {
    const a = ANIMS[clave.replace(/^e\d+_/, '')];
    if (!a || esc.anims.exists(clave) || !esc.textures.exists(clave)) continue;
    esc.anims.create({ key: clave, frames: esc.anims.generateFrameNumbers(clave, {}), frameRate: a.fps, repeat: a.repetir ? -1 : 0 });
  }
}

/**
 * Arranque (R042): carga solo lo necesario para el título y el lugar actual de Rupert (su fondo, sus tiras,
 * objetos e interfaz) y abre el título. El resto (otras etapas, otros fondos y el arte de las changas) lo
 * carga la escena `Carga` en segundo plano mientras se juega.
 */
export class Arranque extends Phaser.Scene {
  constructor() {
    super('Arranque');
  }

  preload(): void {
    const barra = this.add.graphics();
    const t = texto(this, ANCHO / 2, ALTO / 2 - 20, 'Cargando el callejón... el olor viene aparte.', { tam: 14 }).setOrigin(0.5);
    this.load.on('progress', (p: number) => {
      barra.clear();
      barra.fillStyle(0xd9a55b, 1);
      barra.fillRect((ANCHO / 2 - 80) * E, (ALTO / 2) * E, 160 * E * p, 6 * E);
    });
    this.load.on('complete', () => t.destroy());
    this.load.json('anims', 'assets/rupert/anim.json');
    for (const f of fondosEsenciales(juego.e.etapa)) this.load.image(f, img(`fondos/${f}`));
    if (escenarioDeEtapa(juego.e.etapa).lugar === 'callejon') this.load.image('callejon_frente', img('fondos/callejon_e0_primerplano'));
    this.load.image('barra_fondo', img('ui/barra_fondo'));
    for (const o of OBJETOS) this.load.image(o, img(`objetos/${o}`));
  }

  create(): void {
    const meta = this.cache.json.get('anims') as Record<string, Anim>;
    const claves = encolarRupert(this, meta, [juego.e.etapa]);
    this.load.once('complete', () => {
      crearAnimaciones(this, claves);
      this.scene.launch('Carga');
      this.scene.start('Titulo');
    });
    this.load.start();
  }
}

/** Carga en segundo plano todo lo demás; al terminar avisa con el evento `cargado` del juego. */
export class Carga extends Phaser.Scene {
  constructor() {
    super('Carga');
  }

  create(): void {
    const meta = this.cache.json.get('anims') as Record<string, Anim>;
    for (const f of [...FONDOS, 'bar_cocina', 'oficina']) if (!this.textures.exists(f)) this.load.image(f, img(`fondos/${f}`));
    if (!this.textures.exists('callejon_frente')) this.load.image('callejon_frente', img('fondos/callejon_e0_primerplano'));
    for (const o of [...ARTE_MINIJUEGOS, ...ARTE_CHANGAS]) this.load.image(o, img(`minijuegos/${o}`));
    for (const t of TIRAS_CHANGAS) this.load.spritesheet(t.clave, img(`minijuegos/${t.clave}`), { frameWidth: t.w, frameHeight: t.h });
    this.load.image('escalada_fachada', img('minijuegos/escalada_fachada'));
    for (const n of ['dpto', 'dpto_abierto', 'almacen_cartel', 'toldo', 'rupert_golpe', 'soga', 'maceta', 'maceta_rota']) this.load.image(n, img(`minijuegos/${n}`));
    this.load.spritesheet('rupert_entrar', img('minijuegos/rupert_entrar'), { frameWidth: 64, frameHeight: 107 });
    this.load.spritesheet('rupert_escalar', img('minijuegos/rupert_escalar'), { frameWidth: 40, frameHeight: 108 });
    this.load.spritesheet('rupert_bici', img('minijuegos/rupert_bici'), { frameWidth: 80, frameHeight: 106 });
    // Primero la etapa siguiente (la próxima que se va a ver), después el resto.
    const e = juego.e.etapa;
    const claves = encolarRupert(this, meta, [e + 1, ...ETAPAS_CON_SPRITES.filter((x) => x !== e && x !== e + 1)]);
    this.load.on('progress', (p: number) => this.registry.set('progresoCarga', p));
    this.load.once('complete', () => {
      crearAnimaciones(this, claves);
      for (const p of PEATONES) {
        if (!this.anims.exists(`peaton${p.hoja}_caminar`)) {
          this.anims.create({ key: `peaton${p.hoja}_caminar`, frames: this.anims.generateFrameNumbers(`peaton${p.hoja}`, { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
        }
      }
      this.registry.set('todoCargado', true);
      this.game.events.emit('cargado');
      this.scene.stop();
    });
    this.load.start();
  }
}

/**
 * Hace `seguir` cuando ya está todo cargado. Si todavía falta (recién abierta la app con mala conexión),
 * muestra un cartel con el avance y sigue solo al terminar.
 */
export function cuandoCargado(esc: Phaser.Scene, seguir: () => void): void {
  if (esc.registry.get('todoCargado')) {
    seguir();
    return;
  }
  const velo = esc.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, 0.7).setOrigin(0).setDepth(9000).setInteractive();
  const t = texto(esc, ANCHO / 2, ALTO / 2, 'Rupert se pone el overol... 0 %', { tam: 14, alinear: 'center' }).setOrigin(0.5).setDepth(9001);
  const reloj = esc.time.addEvent({ delay: 150, loop: true, callback: () => t.setText(`Rupert se pone el overol... ${Math.round(((esc.registry.get('progresoCarga') as number) ?? 0) * 100)} %`) });
  esc.game.events.once('cargado', () => {
    reloj.remove();
    velo.destroy();
    t.destroy();
    seguir();
  });
}
