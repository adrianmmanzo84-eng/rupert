import type Phaser from 'phaser';
import { ALTO, ANCHO, COLOR, E, boton, caja, texto } from '../ui/ui';

/** Un paso del tutorial: qué se ilumina (px del mundo, o nada) y qué se explica. */
export interface PasoTutorial {
  titulo: string;
  texto: string;
  zona?: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * Tutorial de comandos (R024): oscurece la pantalla salvo la zona que explica, muestra un cartel con
 * «Siguiente» y «Saltar» y no deja tocar el juego mientras tanto. Devuelve una función para cerrarlo.
 */
export function mostrarTutorial(esc: Phaser.Scene, pasos: PasoTutorial[], alTerminar: () => void): () => void {
  const capa = esc.add.container(0, 0).setDepth(6000);
  let i = 0;
  let cerrado = false;

  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    capa.destroy();
    alTerminar();
  };

  const dibujar = () => {
    capa.removeAll(true);
    const p = pasos[i];
    const z = p.zona ? { x0: Math.max(0, p.zona.x0 - 3), y0: Math.max(0, p.zona.y0 - 3), x1: Math.min(ANCHO, p.zona.x1 + 3), y1: Math.min(ALTO, p.zona.y1 + 3) } : null;
    // Sombra alrededor de la zona iluminada (cuatro rectángulos), que también bloquea los toques.
    const sombra = (x: number, y: number, w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const r = esc.add.rectangle(x * E, y * E, w * E, h * E, 0x0b0812, 0.72).setOrigin(0).setInteractive();
      r.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
      capa.add(r);
    };
    if (z) {
      sombra(0, 0, ANCHO, z.y0);
      sombra(0, z.y1, ANCHO, ALTO - z.y1);
      sombra(0, z.y0, z.x0, z.y1 - z.y0);
      sombra(z.x1, z.y0, ANCHO - z.x1, z.y1 - z.y0);
      // La zona en sí no se puede tocar durante el tutorial, pero se ve.
      const tapa = esc.add.rectangle(z.x0 * E, z.y0 * E, (z.x1 - z.x0) * E, (z.y1 - z.y0) * E, 0, 0.001).setOrigin(0).setInteractive();
      tapa.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
      capa.add(tapa);
      const marco = esc.add.graphics();
      marco.lineStyle(E, 0xffd25a, 1).strokeRect(z.x0 * E, z.y0 * E, (z.x1 - z.x0) * E, (z.y1 - z.y0) * E);
      capa.add(marco);
      esc.tweens.add({ targets: marco, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    } else {
      sombra(0, 0, ANCHO, ALTO);
    }

    // Cartel arriba o abajo, del lado contrario a la zona.
    const w = 300;
    const h = 92;
    const centroZona = z ? (z.y0 + z.y1) / 2 : ALTO;
    const y = centroZona > ALTO / 2 ? 34 : ALTO - h - 32;
    const x = (ANCHO - w) / 2;
    const g = esc.add.graphics();
    caja(g, x, y, w, h, COLOR.panel);
    capa.add(g);
    capa.add(texto(esc, x + 10, y + 5, p.titulo, { tam: 13, color: COLOR.oro }));
    capa.add(texto(esc, x + w - 10, y + 6, `${i + 1}/${pasos.length}`, { tam: 10, color: '#c9b9a6' }).setOrigin(1, 0));
    capa.add(texto(esc, x + 10, y + 22, p.texto, { tam: 11, ancho: w - 20 }));
    const ultimo = i === pasos.length - 1;
    capa.add(boton(esc, x + w - 96, y + h - 26, 86, 20, ultimo ? '¡A jugar!' : 'Siguiente', () => {
      if (ultimo) cerrar();
      else {
        i += 1;
        dibujar();
      }
    }).cont);
    if (!ultimo) capa.add(boton(esc, x + 10, y + h - 26, 60, 20, 'Saltar', cerrar, 10).cont);
  };

  dibujar();
  return cerrar;
}
