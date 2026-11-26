import Phaser from 'phaser';
import { ALTO, ANCHO, E, texto } from '../ui/ui';
import { CHAPAS } from '../core/minijuegos';

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
export const ETAPAS_CON_SPRITES = [0, 1, 2, 3];

export const OBJETOS = [
  'lata', 'diario', 'zapato', 'llave', 'moneda', 'paraguas',
  'botella', 'botella_plastico', 'cascara', 'espina', 'caja', 'anillo',
  'sandwich', 'sopa', 'manzana', 'jabon', 'toalla', 'cafe',
  'i_hambre', 'i_higiene', 'i_animo', 'i_moneda', 'i_ayuda', 'i_racha',
  'volantes', 'paloma', 'paloma_vuela', 'billetera', 'caja_herramientas', 'rueda',
  'tijeras', 'peine', 'brocha', 'navaja', 'secador', 'perfume',
  'gorro', 'anteojos', 'monio', 'gorra', 'guantes', 'flor',
  'botella_aplastada', 'vaso_yogur', 'bidon', 'bolsa', 'frasco', 'botella_vino', 'vaso', 'salsa', 'carton', 'maple', 'revistas', 'conserva',
  'reloj', 'autito', 'osito', 'radio', 'auriculares', 'taza', 'patito', 'libro', 'media', 'manzana_podrida', 'pan_moho', 'cucaracha',
  'plato_sucio', 'plato_limpio', 'taza_sucia', 'taza_limpia', 'esponja', 'pila_platos',
];

/** Arte propio de los minijuegos: tachos, ratones (4 colores × 4 fotogramas) y chapitas. */
export const ARTE_MINIJUEGOS = [
  ...['plastico', 'vidrio', 'papel', 'metal'].map((t) => `tacho_${t}`),
  ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((f) => `raton${r}_${f}`)),
  ...CHAPAS.map((c) => `chapa_${c}`),
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
    this.load.image('callejon_e0', 'assets/fondos/callejon_e0.png');
    this.load.image('callejon_e1', 'assets/fondos/callejon_e1.png');
    this.load.image('callejon_frente', 'assets/fondos/callejon_e0_primerplano.png');
    this.load.image('bar_cocina', 'assets/fondos/bar_cocina.png');
    this.load.image('barra_fondo', 'assets/ui/barra_fondo.png');
    for (const o of OBJETOS) this.load.image(o, `assets/objetos/${o}.png`);
    for (const o of ARTE_MINIJUEGOS) this.load.image(o, `assets/minijuegos/${o}.png`);
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
      for (const tex of ['callejon_e0', 'callejon_e1', 'callejon_frente', 'bar_cocina', 'barra_fondo', ...OBJETOS, ...ARTE_MINIJUEGOS]) {
        this.textures.get(tex).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      this.scene.start('Callejon');
    });
    this.load.start();
  }
}
