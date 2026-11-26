import Phaser from 'phaser';
import { guardarPartida } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, caja, texto } from '../ui/ui';

/**
 * Pausa de las changas (R023). Se abre encima de la changa, que queda congelada (reloj, animaciones y física).
 * Continuar la retoma tal como estaba; Salir vuelve al hogar sin cobrar la changa.
 */
export class Pausa extends Phaser.Scene {
  private de = '';

  constructor() {
    super('Pausa');
  }

  init(datos: { de: string }): void {
    this.de = datos.de;
  }

  create(): void {
    this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0b0812, 0.7).setOrigin(0).setInteractive();
    const g = this.add.graphics();
    caja(g, 150, 70, 180, 130, COLOR.panel);
    texto(this, 240, 78, 'Pausa', { tam: 20, color: COLOR.oro }).setOrigin(0.5, 0);
    boton(this, 170, 108, 140, 28, 'Continuar', () => this.continuar(), 14);
    boton(this, 170, 144, 140, 24, 'Salir con Rupert', () => this.salir(), 12);
    texto(this, 240, 174, 'Si sales, esta changa no se cobra.', { tam: 9, color: '#c9b9a6' }).setOrigin(0.5, 0);
    this.input.keyboard?.once('keydown-ESC', () => this.continuar());
  }

  /** Botón Atrás del teléfono: sigue jugando. */
  atras(): boolean {
    this.continuar();
    return true;
  }

  private continuar(): void {
    this.scene.resume(this.de);
    this.scene.stop();
  }

  private salir(): void {
    guardarPartida();
    const changa = this.scene.get(this.de);
    this.scene.stop();
    changa.scene.start('Hogar');
  }
}
