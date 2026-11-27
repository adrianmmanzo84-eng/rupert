import Phaser from 'phaser';
import { sonar } from '../audio/sonido';
import { E } from './ui';

/**
 * Efectos comunes de las changas (R028): partículas, destellos, chispas, gotas y salpicaduras, con texturas
 * pequeñas dibujadas al vuelo (no hace falta arte). Las coordenadas que reciben son de pantalla (ya × E).
 */

/** Crea las texturas de partículas una sola vez por juego. */
export function texturasFx(esc: Phaser.Scene): void {
  if (esc.textures.exists('fx_bola')) return;
  const g = esc.make.graphics({ x: 0, y: 0 }, false);
  // Punto redondo suave (8 px): chispas, polvo, confeti.
  g.fillStyle(0xffffff, 0.35).fillCircle(4, 4, 4);
  g.fillStyle(0xffffff, 1).fillCircle(4, 4, 2.6);
  g.generateTexture('fx_bola', 8, 8);
  g.clear();
  // Cuadradito duro (pixel).
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3);
  g.generateTexture('fx_px', 3, 3);
  g.clear();
  // Gota (4 × 6).
  g.fillStyle(0xffffff, 1).fillCircle(2, 4, 2);
  g.fillTriangle(0.4, 3.6, 3.6, 3.6, 2, 0);
  g.generateTexture('fx_gota', 4, 6);
  g.clear();
  // Estrellita de cuatro puntas (7 × 7).
  g.fillStyle(0xffffff, 1).fillRect(3, 0, 1, 7).fillRect(0, 3, 7, 1).fillRect(2, 2, 3, 3);
  g.generateTexture('fx_estrella', 7, 7);
  g.clear();
  // Burbuja (anillo, 8 × 8).
  g.lineStyle(1, 0xffffff, 1).strokeCircle(4, 4, 3);
  g.fillStyle(0xffffff, 0.8).fillRect(2, 2, 1, 1);
  g.generateTexture('fx_burbuja', 8, 8);
  g.destroy();
}

interface OpcionesEstallido {
  textura?: string;
  colores?: number[];
  cantidad?: number;
  velocidad?: [number, number];
  vida?: number;
  gravedad?: number;
  escala?: number;
  angulo?: [number, number];
  profundidad?: number;
}

/** Estallido de partículas en un punto (se borra solo). */
export function estallido(esc: Phaser.Scene, x: number, y: number, o: OpcionesEstallido = {}): void {
  texturasFx(esc);
  const vida = o.vida ?? 550;
  const em = esc.add.particles(x, y, o.textura ?? 'fx_bola', {
    speed: { min: (o.velocidad?.[0] ?? 40) * E, max: (o.velocidad?.[1] ?? 120) * E },
    angle: { min: o.angulo?.[0] ?? 0, max: o.angulo?.[1] ?? 360 },
    lifespan: { min: vida * 0.6, max: vida },
    scale: { start: (o.escala ?? 1) * E * 0.7, end: 0 },
    alpha: { start: 1, end: 0.2 },
    gravityY: (o.gravedad ?? 0) * E,
    tint: o.colores ?? [0xffffff],
    rotate: { min: 0, max: 360 },
    emitting: false,
  });
  em.setDepth(o.profundidad ?? 55);
  em.explode(o.cantidad ?? 14);
  esc.time.delayedCall(vida + 100, () => em.destroy());
}

/** Anillo que se expande y se desvanece (onda de un golpe, gota que cae al agua, foco que se enciende). */
export function onda(esc: Phaser.Scene, x: number, y: number, color = 0xffffff, radio = 18, ms = 380, grosor = 2): void {
  const c = esc.add.circle(x, y, 4 * E).setStrokeStyle(grosor * E, color, 1).setDepth(54);
  esc.tweens.add({
    targets: c, radius: radio * E, alpha: 0, duration: ms, ease: 'Cubic.easeOut',
    onUpdate: () => c.setStrokeStyle(grosor * E * c.alpha + 0.5, color, c.alpha),
    onComplete: () => c.destroy(),
  });
}

/** Acierto: estrellitas doradas y una onda. */
export function brillo(esc: Phaser.Scene, x: number, y: number, colores = [0xffe9a0, 0xffd25a, 0xffffff]): void {
  estallido(esc, x, y, { textura: 'fx_estrella', colores, cantidad: 10, velocidad: [30, 90], vida: 520 });
  onda(esc, x, y, colores[0], 20);
}

/** Error: polvo gris y un golpecito de cámara. */
export function polvo(esc: Phaser.Scene, x: number, y: number): void {
  estallido(esc, x, y, { textura: 'fx_px', colores: [0x8a7f99, 0x5a5066, 0xc9b9a6], cantidad: 10, velocidad: [20, 70], vida: 420, gravedad: 120 });
}

/** Chispas eléctricas: rápidas, cortas, amarillas y blancas. */
export function chispas(esc: Phaser.Scene, x: number, y: number, cantidad = 12): void {
  estallido(esc, x, y, { textura: 'fx_px', colores: [0xfff2a8, 0xffffff, 0xffd25a, 0x9fe8ff], cantidad, velocidad: [80, 200], vida: 260, escala: 1.2 });
}

/** Salpicadura de agua: gotas azules que saltan y caen. */
export function salpicadura(esc: Phaser.Scene, x: number, y: number, cantidad = 12, angulo: [number, number] = [200, 340]): void {
  estallido(esc, x, y, { textura: 'fx_gota', colores: [0x4fa8ff, 0x9fd4ff, 0xffffff], cantidad, velocidad: [50, 130], vida: 650, gravedad: 320, angulo, escala: 1.3 });
}

/** Confeti de colores (cumplir un nivel, terminar bien una changa). */
export function confeti(esc: Phaser.Scene, x: number, y: number, cantidad = 26): void {
  estallido(esc, x, y, {
    textura: 'fx_px', colores: [0xff5a4f, 0x4fa8ff, 0x7fd16b, 0xffd25a, 0xc77dff, 0xffa04f], cantidad,
    velocidad: [80, 190], vida: 1100, gravedad: 260, angulo: [200, 340], escala: 1.4,
  });
}

/** Monedas que saltan desde un punto hacia otro (por ejemplo, hacia el marcador). */
export function monedasHacia(esc: Phaser.Scene, x0: number, y0: number, x1: number, y1: number, n = 6): void {
  texturasFx(esc);
  sonar('aporte');
  for (let i = 0; i < n; i++) {
    const m = esc.add.image(x0, y0, esc.textures.exists('i_moneda') ? 'i_moneda' : 'fx_bola').setDepth(56).setScale(E * 0.8);
    const sx = x0 + Phaser.Math.Between(-30, 30) * E;
    const sy = y0 - Phaser.Math.Between(20, 50) * E;
    esc.tweens.add({
      targets: m, x: sx, y: sy, duration: 220, ease: 'Quad.easeOut', delay: i * 45,
      onComplete: () => esc.tweens.add({ targets: m, x: x1, y: y1, scale: E * 0.4, duration: 380, ease: 'Cubic.easeIn', onComplete: () => m.destroy() }),
    });
  }
}

/** Pequeño rebote de escala (aparecer, apretar, acertar). */
export function rebote(esc: Phaser.Scene, obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, fuerza = 1.15, ms = 120): void {
  const sx = obj.scaleX;
  const sy = obj.scaleY;
  esc.tweens.add({ targets: obj, scaleX: sx * fuerza, scaleY: sy * (2 - fuerza), duration: ms, yoyo: true, ease: 'Quad.easeOut', onComplete: () => obj.setScale(sx, sy) });
}

/** Humo gris que sube (comida pasada, caño de escape). */
export function humo(esc: Phaser.Scene, x: number, y: number): void {
  estallido(esc, x, y, { textura: 'fx_bola', colores: [0x8a8a92, 0x5a5a62, 0xb0b0b8], cantidad: 12, velocidad: [15, 45], vida: 1000, gravedad: -60, angulo: [230, 310], escala: 2.2 });
}
