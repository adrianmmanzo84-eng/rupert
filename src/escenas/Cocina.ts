import Phaser from 'phaser';
import { INGREDIENTES, type Receta, pasoCocina, puntosReceta, siguienteReceta } from '../core/changas';
import { COLOR, E, caja, texto } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 60_000;
const NOMBRES: Record<string, string> = {
  olla: 'Olla', sarten: 'Sartén', arroz: 'Arroz', fideos: 'Fideos', tomate: 'Tomate', cebolla: 'Cebolla',
  huevo: 'Huevo', papa: 'Papa', zanahoria: 'Zanahoria', carne: 'Carne',
};

/** Cocinar recetas: elegir el utensilio y poner los ingredientes en el orden de la receta. */
export class Cocina extends Phaser.Scene {
  private puntos = 0;
  private platos = 0;
  private hechos = 0;
  private reloj = 0;
  private fin = 0;
  private terminado = false;
  private esperando = true;
  private marcador!: Marcador;
  private receta: Receta | null = null;
  private tarjeta!: Phaser.GameObjects.Container;
  private olla!: Phaser.GameObjects.Image;
  private dentro!: Phaser.GameObjects.Container;

  constructor() {
    super('Cocina');
  }

  create(): void {
    this.puntos = 0;
    this.platos = 0;
    this.reloj = 0;
    this.terminado = false;
    this.esperando = true;
    this.receta = null;
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Cocinar recetas', 0.55);

    const g = this.add.graphics();
    caja(g, 8, 44, 150, 140, COLOR.panel);
    this.tarjeta = this.add.container(0, 0);
    caja(g, 176, 44, 150, 140, 0x3a2b22, COLOR.borde);
    this.add.image(251 * E, 176 * E, 'hornillo').setOrigin(0.5, 1).setScale(E * 1.6);
    this.olla = this.add.image(251 * E, 140 * E, 'olla').setOrigin(0.5, 1).setScale(E * 1.4).setVisible(false);
    this.dentro = this.add.container(0, 0);

    // Utensilios a la derecha y los ingredientes abajo.
    (['olla', 'sarten'] as const).forEach((u, i) => this.botonCosa(u, 380, 78 + i * 58, 1.1));
    INGREDIENTES.forEach((ing, i) => this.botonCosa(ing, 34 + i * 59, 222, 1.25));

    aviso(this, 'Elige el utensilio y pon los ingredientes\nen el orden de la receta.', 1800);
    this.time.delayedCall(1800, () => this.nuevaReceta());
  }

  private botonCosa(clave: string, x: number, y: number, escala: number): void {
    const gb = this.add.graphics();
    const w = clave === 'olla' || clave === 'sarten' ? 84 : 54;
    caja(gb, x - w / 2, y - 26, w, 52, 0x2a1f33, COLOR.borde);
    const img = this.add.image(x * E, (y - 5) * E, clave).setScale(E * escala * (w > 60 ? 0.8 : 1));
    texto(this, x, y + 14, NOMBRES[clave], { tam: 9 }).setOrigin(0.5, 0);
    const zona = this.add.zone((x - w / 2) * E, (y - 26) * E, w * E, 52 * E).setOrigin(0).setInteractive({ useHandCursor: true });
    zona.on('pointerdown', () => {
      this.tweens.add({ targets: img, y: img.y - 4 * E, duration: 70, yoyo: true });
      this.poner(clave, x, y);
    });
  }

  private nuevaReceta(): void {
    if (this.terminado) return;
    this.receta = siguienteReceta(this.receta?.nombre ?? null);
    this.hechos = 0;
    this.olla.setVisible(false);
    this.dentro.removeAll(true);
    this.dibujarTarjeta();
    this.esperando = false;
  }

  private dibujarTarjeta(): void {
    const r = this.receta!;
    this.tarjeta.removeAll(true);
    this.tarjeta.add(texto(this, 83, 48, r.nombre, { tam: 12, color: COLOR.oro }).setOrigin(0.5, 0));
    const pasos = [r.utensilio, ...r.pasos];
    pasos.forEach((p, i) => {
      const y = 70 + i * 22;
      const hecho = i < this.hechos;
      this.tarjeta.add(this.add.image(26 * E, y * E, p).setScale(E * (i === 0 ? 0.32 : 0.6)).setAlpha(hecho ? 0.45 : 1));
      this.tarjeta.add(texto(this, 42, y - 6, `${i + 1}. ${NOMBRES[p]}${hecho ? '  ✓' : ''}`, { tam: 11, color: hecho ? COLOR.verde : COLOR.tinta }));
    });
  }

  private poner(clave: string, x: number, y: number): void {
    if (this.terminado || this.esperando || !this.receta) return;
    const r = this.receta;
    const res = pasoCocina(r, this.hechos, clave);
    if (res === 'mal') {
      this.puntos = Math.max(0, this.puntos - 3);
      this.marcador.puntos(this.puntos);
      flotar(this, this.hechos === 0 ? '-3 Ese no es el utensilio' : '-3 ¡Se arruinó!', 251, 70, false);
      this.cameras.main.shake(110, 0.005);
      if (this.hechos > 0) {
        // Se arruina la comida: hay que empezar la receta de nuevo.
        this.hechos = 0;
        this.olla.setVisible(false);
        this.dentro.removeAll(true);
        this.dibujarTarjeta();
      }
      return;
    }
    if (this.hechos === 0) {
      this.olla.setTexture(clave).setVisible(true).setScale(E * (clave === 'sarten' ? 1.2 : 1.4));
    } else {
      // El ingrediente salta al utensilio.
      const ing = this.add.image(x * E, y * E, clave).setScale(E * 0.9);
      this.dentro.add(ing);
      this.tweens.add({
        targets: ing, x: (240 + Math.random() * 22) * E, y: (112 + Math.random() * 6) * E, scale: E * 0.6, duration: 260, ease: 'Quad.easeOut',
      });
    }
    this.hechos += 1;
    this.dibujarTarjeta();
    if (res === 'listo') {
      this.esperando = true;
      const p = puntosReceta(r);
      this.puntos += p;
      this.platos += 1;
      this.marcador.puntos(this.puntos);
      this.time.delayedCall(320, () => {
        this.dentro.removeAll(true);
        this.olla.setVisible(false);
        const plato = this.add.image(251 * E, 110 * E, r.plato).setScale(E * (r.plato === 'sarten' ? 1.3 : 1.2));
        flotar(this, `+${p} ¡${r.nombre}!`, 251, 70, true);
        this.time.delayedCall(900, () => {
          plato.destroy();
          this.nuevaReceta();
        });
      });
    }
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0) {
      this.terminado = true;
      terminarMinijuego(this, this.puntos, `Cocinaste ${this.platos} platos`);
    }
  }
}
