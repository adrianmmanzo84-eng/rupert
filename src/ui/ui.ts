import Phaser from 'phaser';

/** El mundo mide 480×270 y se dibuja al doble para que los textos salgan nítidos. */
export const E = 2;
export const ANCHO = 480;
export const ALTO = 270;
export const FUENTE = '"VT323", monospace';

export const COLOR = {
  tinta: '#fbf1d6',
  sombra: '#1b1424',
  oro: '#ffd25a',
  rojo: '#ff7a6b',
  verde: '#8ee07a',
  panel: 0x2a1f33,
  borde: 0xd9a55b,
  boton: 0xc1642c,
  botonOff: 0x5b4a52,
};

export interface OpcionesTexto {
  tam?: number;
  color?: string;
  ancho?: number;
  alinear?: 'left' | 'center' | 'right';
}

/** Texto en coordenadas del mundo (x, y en píxeles de 480×270). */
export function texto(esc: Phaser.Scene, x: number, y: number, s: string, o: OpcionesTexto = {}): Phaser.GameObjects.Text {
  const t = esc.add.text(x * E, y * E, s, {
    fontFamily: FUENTE,
    fontSize: `${(o.tam ?? 11) * E}px`,
    color: o.color ?? COLOR.tinta,
    align: o.alinear ?? 'left',
    stroke: COLOR.sombra,
    strokeThickness: 4,
    wordWrap: o.ancho ? { width: o.ancho * E } : undefined,
    lineSpacing: -2,
  });
  return t;
}

/** Rectángulo redondeado con borde, en coordenadas del mundo. */
export function caja(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, relleno: number, borde = COLOR.borde, alfa = 0.95): void {
  g.fillStyle(relleno, alfa);
  g.fillRoundedRect(x * E, y * E, w * E, h * E, 4 * E);
  g.lineStyle(E, borde, 1);
  g.strokeRoundedRect(x * E, y * E, w * E, h * E, 4 * E);
}

export interface Boton {
  cont: Phaser.GameObjects.Container;
  activar(si: boolean): void;
  rotulo(s: string): void;
}

/** Botón táctil (mínimo 18 px de alto en el mundo = 36 px reales a escala 1). */
export function boton(esc: Phaser.Scene, x: number, y: number, w: number, h: number, s: string, alPulsar: () => void, tam = 11): Boton {
  const cont = esc.add.container(x * E, y * E);
  const g = esc.add.graphics();
  const t = esc.add.text((w / 2) * E, (h / 2) * E, s, { fontFamily: FUENTE, fontSize: `${tam * E}px`, color: COLOR.tinta, stroke: COLOR.sombra, strokeThickness: 4 }).setOrigin(0.5);
  let activo = true;
  const pintar = (apretado = false) => {
    g.clear();
    caja(g, 0, apretado ? 1 : 0, w, h, activo ? COLOR.boton : COLOR.botonOff);
    t.setY((h / 2 + (apretado ? 1 : 0)) * E);
  };
  pintar();
  cont.add([g, t]);
  const zona = esc.add.zone(0, 0, w * E, h * E).setOrigin(0).setInteractive({ useHandCursor: true });
  cont.add(zona);
  zona.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    if (!activo) return;
    pintar(true);
  });
  zona.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    pintar(false);
    if (activo) alPulsar();
  });
  zona.on('pointerout', () => pintar(false));
  return {
    cont,
    activar(si) {
      activo = si;
      pintar();
    },
    rotulo(s2) {
      t.setText(s2);
    },
  };
}

export interface FilaPanel {
  icono?: string;
  titulo: string;
  detalle?: string;
  accion?: string;
  activa?: boolean;
  alPulsar?: () => void;
}

/** Paneles abiertos, el último arriba: el botón Atrás del teléfono cierra el de más arriba. */
const abiertos: (() => void)[] = [];

/** Cierra el panel abierto más reciente; devuelve false si no había ninguno. */
export function cerrarUltimoPanel(): boolean {
  const cerrar = abiertos.pop();
  if (!cerrar) return false;
  cerrar();
  return true;
}

/** Panel modal con lista de filas. Devuelve una función para cerrarlo. */
export function panel(esc: Phaser.Scene, titulo: string, filas: FilaPanel[], pie?: string, alCerrar?: () => void): () => void {
  const capa = esc.add.container(0, 0).setDepth(5000);
  const tapa = esc.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, 0.6).setOrigin(0).setInteractive();
  tapa.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
  capa.add(tapa);
  const w = 300;
  const altoFila = 26;
  const h = 40 + filas.length * altoFila + (pie ? 18 : 0) + 8;
  const x = (ANCHO - w) / 2;
  const y = Math.max(8, (ALTO - h) / 2);
  const g = esc.add.graphics();
  caja(g, x, y, w, h, COLOR.panel);
  capa.add(g);
  capa.add(texto(esc, x + 10, y + 5, titulo, { tam: 14, color: COLOR.oro }));
  const cerrar = () => {
    const i = abiertos.indexOf(cerrar);
    if (i >= 0) abiertos.splice(i, 1);
    if (!capa.active) return;
    capa.destroy();
    alCerrar?.();
  };
  abiertos.push(cerrar);
  // Si la escena se cierra con el panel abierto, se olvida.
  esc.events.once('shutdown', () => {
    const i = abiertos.indexOf(cerrar);
    if (i >= 0) abiertos.splice(i, 1);
  });
  capa.add(boton(esc, x + w - 26, y + 5, 20, 18, 'X', cerrar).cont);
  filas.forEach((f, i) => {
    const fy = y + 30 + i * altoFila;
    let tx = x + 10;
    if (f.icono) {
      const ic = esc.add.image((x + 20) * E, (fy + 11) * E, f.icono);
      // Cabe en una casilla de 20 px, sin agrandar los íconos chicos más que antes.
      ic.setScale(Math.min(E * 0.8, (20 * E) / Math.max(ic.width, ic.height)));
      capa.add(ic);
      tx = x + 36;
    }
    capa.add(texto(esc, tx, fy + 1, f.titulo, { tam: 12 }));
    if (f.detalle) capa.add(texto(esc, tx, fy + 11, f.detalle, { tam: 9, color: '#c9b9a6' }));
    if (f.accion && f.alPulsar) {
      const b = boton(esc, x + w - 84, fy + 2, 74, 19, f.accion, f.alPulsar, 10);
      b.activar(f.activa !== false);
      capa.add(b.cont);
    }
  });
  if (pie) capa.add(texto(esc, x + 10, y + h - 22, pie, { tam: 9, color: '#c9b9a6', ancho: w - 20 }));
  return cerrar;
}
