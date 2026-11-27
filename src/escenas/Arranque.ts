import Phaser from 'phaser';
import { ALTO, ANCHO, E, texto } from '../ui/ui';
import { CHAPAS } from '../core/minijuegos';
import { ARREGLOS, HERRAMIENTAS, INGREDIENTES, PEATONES, PIEZAS } from '../core/changas';
import { FONDOS } from '../core/lugares';

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
  'sandwich', 'sopa', 'manzana', 'jabon', 'shampoo', 'toalla', 'cafe', 'ducha_callejon_0', 'ducha_callejon_1', 'ducha_plaza', 'ducha_plaza_abierta',
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

/** Arte de las changas de cocina, arreglos, volantes y taller (v0.10). */
export const ARTE_CHANGAS = [
  'hornillo', 'olla', 'sarten', 'tabla', ...INGREDIENTES, 'plato_arroz', 'plato_fideos', 'plato_guiso',
  ...ARREGLOS.flatMap((a) => [`${a.objeto}_rota`, `${a.objeto}_ok`]), ...HERRAMIENTAS.map((h) => `herr_${h}`),
  'volante', 'motor', ...PIEZAS.flatMap((p) => [`pieza_${p}_gastada`, `pieza_${p}_nueva`]),
];

/** Hojas de fotogramas de las changas: celdas del mismo tamaño en una fila. */
export const TIRAS_CHANGAS: { clave: string; w: number; h: number }[] = [
  { clave: 'entrevistador', w: 95, h: 121 },
  ...PEATONES.map((p) => ({ clave: `peaton${p.hoja}`, w: 62, h: 73 })),
];

export class Arranque extends Phaser.Scene {
  constructor() {
    super('Arranque');
  }

  preload(): void {
    const barra = this.add.graphics();
    const t = texto(this, ANCHO / 2, ALTO / 2 - 20, 'Cargando el callejón...', { tam: 14 }).setOrigin(0.5);
    this.load.on('progress', (p: number) => {
      barra.clear();
      barra.fillStyle(0xd9a55b, 1);
      barra.fillRect((ANCHO / 2 - 80) * E, (ALTO / 2) * E, 160 * E * p, 6 * E);
    });
    this.load.on('complete', () => t.destroy());
    this.load.json('anims', 'assets/rupert/anim.json');
    for (const f of FONDOS) this.load.image(f, `assets/fondos/${f}.png`);
    this.load.image('callejon_frente', 'assets/fondos/callejon_e0_primerplano.png');
    this.load.image('bar_cocina', 'assets/fondos/bar_cocina.png');
    this.load.image('barra_fondo', 'assets/ui/barra_fondo.png');
    for (const o of OBJETOS) this.load.image(o, `assets/objetos/${o}.png`);
    for (const o of ARTE_MINIJUEGOS) this.load.image(o, `assets/minijuegos/${o}.png`);
    for (const o of ARTE_CHANGAS) this.load.image(o, `assets/minijuegos/${o}.png`);
    for (const t of TIRAS_CHANGAS) this.load.spritesheet(t.clave, `assets/minijuegos/${t.clave}.png`, { frameWidth: t.w, frameHeight: t.h });
    this.load.image('oficina', 'assets/fondos/oficina.png');
    this.load.spritesheet('rupert_bici', 'assets/minijuegos/rupert_bici.png', { frameWidth: 80, frameHeight: 106 });
  }

  create(): void {
    // Con las medidas de cada tira ya leídas, se cargan los sprites de Rupert.
    const meta = this.cache.json.get('anims') as Record<string, Anim>;
    for (const [clave, m] of Object.entries(meta)) {
      this.load.spritesheet(clave, `assets/rupert/${clave}.png`, { frameWidth: m.w, frameHeight: m.h });
    }
    this.load.once('complete', () => {
      for (const clave of Object.keys(meta)) {
        const nombre = clave.replace(/^e\d+_/, '');
        const a = ANIMS[nombre];
        if (!a) continue;
        this.anims.create({
          key: clave,
          frames: this.anims.generateFrameNumbers(clave, {}),
          frameRate: a.fps,
          repeat: a.repetir ? -1 : 0,
        });
      }
      for (const p of PEATONES) {
        this.anims.create({ key: `peaton${p.hoja}_caminar`, frames: this.anims.generateFrameNumbers(`peaton${p.hoja}`, { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
      }
      for (const tex of [...FONDOS, 'callejon_frente', 'bar_cocina', 'barra_fondo', 'oficina', ...OBJETOS, ...ARTE_MINIJUEGOS, ...ARTE_CHANGAS, ...TIRAS_CHANGAS.map((t) => t.clave)]) {
        this.textures.get(tex).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      this.scene.start('Titulo');
    });
    this.load.start();
  }
}
