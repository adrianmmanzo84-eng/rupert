import Phaser from 'phaser';
import { type Acertijo, acertijo, nivelExamen, puntosExamen } from '../core/examenes';
import { juego } from '../juego';
import { COLOR, boton, caja, texto } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

const DURACION = 60_000;

/** Exámenes de ingenio: acertijos de cuatro opciones contra reloj, en el instituto. */
export class Examenes extends Phaser.Scene {
  private puntos = 0;
  private aciertos = 0;
  private errores = 0;
  private racha = 0;
  private fin = 0;
  private reloj = 0;
  private terminado = false;
  private esperando = false;
  private marcador!: Marcador;
  private actual: Acertijo | null = null;
  private capa!: Phaser.GameObjects.Container;
  private enunciado!: Phaser.GameObjects.Text;

  constructor() {
    super('Examenes');
  }

  create(): void {
    this.puntos = 0;
    this.aciertos = 0;
    this.errores = 0;
    this.racha = 0;
    this.reloj = 0;
    this.terminado = false;
    this.esperando = false;
    this.fin = DURACION + 1500;
    this.marcador = montarMinijuego(this, 'Exámenes de ingenio', 0.6);

    const g = this.add.graphics();
    caja(g, 40, 48, 400, 70, COLOR.panel);
    texto(this, 50, 51, 'Pregunta:', { tam: 11, color: COLOR.oro });
    this.enunciado = texto(this, 240, 86, '', { tam: 16, alinear: 'center', ancho: 380 }).setOrigin(0.5);
    this.capa = this.add.container(0, 0);
    aviso(this, 'Responde todo lo que puedas en un minuto.\nAciertos seguidos suman más. Errores: mi hobby.');
    this.time.delayedCall(1500, () => this.siguiente());
  }

  private siguiente(): void {
    if (this.terminado) return;
    this.esperando = false;
    this.actual = acertijo(nivelExamen(this.aciertos, juego.e.etapa));
    this.enunciado.setText(this.actual.pregunta);
    this.capa.removeAll(true);
    this.actual.opciones.forEach((v, i) => {
      const x = i % 2 === 0 ? 70 : 250;
      const y = 136 + Math.floor(i / 2) * 44;
      const b = boton(this, x, y, 160, 34, `${v}${this.actual!.unidad}`, () => this.responder(v, x + 80, y), 15);
      this.capa.add(b.cont);
    });
  }

  private responder(v: number, x: number, y: number): void {
    if (this.terminado || this.esperando || !this.actual) return;
    this.esperando = true;
    const bien = v === this.actual.correcta;
    const p = puntosExamen(bien, this.racha);
    this.racha = bien ? this.racha + 1 : 0;
    if (bien) this.aciertos += 1;
    else this.errores += 1;
    this.puntos = Math.max(0, this.puntos + p);
    this.marcador.puntos(this.puntos);
    flotar(this, bien ? `+${p}` : `${p}  era ${this.actual.correcta}${this.actual.unidad}`, x, y, bien);
    if (!bien) this.cameras.main.shake(100, 0.004);
    this.time.delayedCall(bien ? 350 : 900, () => this.siguiente());
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    if (this.terminado) return;
    const resta = Math.max(0, this.fin - this.reloj);
    this.marcador.tiempo(Math.ceil(Math.min(resta, DURACION) / 1000));
    if (resta <= 0) {
      this.terminado = true;
      this.capa.removeAll(true);
      terminarMinijuego(this, this.puntos, `Acertaste ${this.aciertos} de ${this.aciertos + this.errores}`);
    }
  }
}
