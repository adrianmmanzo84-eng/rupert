import Phaser from 'phaser';
import {
  type Pregunta,
  type Respuesta,
  PUNTOS_RESPUESTA,
  SEGUNDOS_POR_PREGUNTA,
  armarEntrevista,
  resultadoEntrevista,
} from '../core/entrevista';
import { juego } from '../juego';
import { COLOR, E, boton, caja, texto } from '../ui/ui';
import { type Marcador, aviso, flotar, montarMinijuego, terminarMinijuego } from './comun';

/** Entrevista de trabajo: elegir la mejor respuesta a cada pregunta antes de que se acabe el tiempo. */
export class Entrevista extends Phaser.Scene {
  private puntos = 0;
  private buenas = 0;
  private reloj = 0;
  private limite = 0;
  private indice = -1;
  private esperando = true;
  private terminado = false;
  private preguntas: Pregunta[] = [];
  private marcador!: Marcador;
  private capa!: Phaser.GameObjects.Container;
  private dice!: Phaser.GameObjects.Text;
  private barra!: Phaser.GameObjects.Graphics;
  private rupert?: Phaser.GameObjects.Sprite;
  private jefe!: Phaser.GameObjects.Sprite;
  private boca?: Phaser.Time.TimerEvent;

  constructor() {
    super('Entrevista');
  }

  create(): void {
    this.puntos = 0;
    this.buenas = 0;
    this.reloj = 0;
    this.indice = -1;
    this.esperando = true;
    this.terminado = false;
    this.preguntas = armarEntrevista();
    // Oficina de fondo: Rupert a la izquierda y el entrevistador en su escritorio, a la derecha.
    this.add.image(0, 0, 'oficina').setOrigin(0).setScale(E);
    this.marcador = montarMinijuego(this, 'Entrevista de trabajo', 0.2, false);
    this.jefe = this.add.sprite(418 * E, 268 * E, 'entrevistador', 0).setOrigin(0.5, 1).setScale(E * 1.15);

    const g = this.add.graphics();
    caja(g, 104, 44, 252, 62, COLOR.panel);
    texto(this, 112, 47, 'Entrevistador:', { tam: 11, color: COLOR.oro });
    this.dice = texto(this, 230, 80, '', { tam: 13, alinear: 'center', ancho: 236 }).setOrigin(0.5);
    this.barra = this.add.graphics();
    this.capa = this.add.container(0, 0);

    // Rupert de la etapa actual, a la izquierda, escuchando.
    const clave = `e${juego.e.etapa}_quieto_34`;
    if (this.textures.exists(clave)) {
      this.rupert = this.add.sprite(52 * E, 266 * E, clave, 0).setOrigin(0.5, 1);
      this.rupert.setScale((150 * E) / this.rupert.height);
    }

    aviso(this, 'Elige la mejor respuesta a cada pregunta.\nSi dudas, no digas “ratón”.', 1800);
    this.time.delayedCall(1800, () => this.siguiente());
  }

  private siguiente(): void {
    if (this.terminado) return;
    this.indice += 1;
    this.capa.removeAll(true);
    if (this.indice >= this.preguntas.length) {
      this.terminar();
      return;
    }
    const p = this.preguntas[this.indice];
    this.dice.setText(p.texto).setColor(COLOR.tinta);
    this.hablar(1100);
    this.marcador.tiempo(`Pregunta ${this.indice + 1} de ${this.preguntas.length}`);
    p.respuestas.forEach((r, i) => {
      const b = boton(this, 104, 122 + i * 46, 252, 40, '', () => this.responder(r));
      // Texto propio, en varias líneas si hace falta.
      b.cont.add(texto(this, 126, 20, r.texto, { tam: 10, alinear: 'center', ancho: 240 }).setOrigin(0.5));
      this.capa.add(b.cont);
    });
    this.limite = this.reloj + SEGUNDOS_POR_PREGUNTA * 1000;
    this.esperando = false;
  }

  private responder(r: Respuesta | null): void {
    if (this.terminado || this.esperando) return;
    this.esperando = true;
    this.capa.removeAll(true);
    const p = r ? PUNTOS_RESPUESTA[r.calidad] : 0;
    if (r?.calidad === 'buena') this.buenas += 1;
    this.puntos += p;
    this.marcador.puntos(this.puntos);
    const reaccion = r ? r.reaccion : 'Veo que se quedó sin palabras. Es un récord.';
    const color = !r || r.calidad === 'mala' ? COLOR.rojo : r.calidad === 'buena' ? COLOR.verde : COLOR.oro;
    this.dice.setText(reaccion).setColor(color);
    this.boca?.remove();
    this.jefe.setFrame(!r || r.calidad === 'mala' ? 3 : r.calidad === 'buena' ? 2 : 1);
    flotar(this, p > 0 ? `+${p}` : '+0', 230, 150, p > 0);
    if (this.rupert && r && this.anims.exists(`e${juego.e.etapa}_hablar`)) {
      this.rupert.play(`e${juego.e.etapa}_hablar`);
      this.time.delayedCall(900, () => this.rupert?.anims.stop());
    }
    this.time.delayedCall(1700, () => this.siguiente());
  }

  /** El entrevistador mueve la boca mientras pregunta y después queda atento. */
  private hablar(ms: number): void {
    this.boca?.remove();
    let n = 0;
    this.boca = this.time.addEvent({
      delay: 140, repeat: Math.floor(ms / 140),
      callback: () => {
        n += 1;
        this.jefe.setFrame(n * 140 >= ms ? 0 : n % 2);
      },
    });
  }

  private terminar(): void {
    this.terminado = true;
    this.barra.clear();
    const res = resultadoEntrevista(this.puntos);
    this.dice.setText(res.veredicto).setColor(res.contratado ? COLOR.verde : COLOR.tinta);
    this.jefe.setFrame(res.contratado ? 2 : 0);
    this.time.delayedCall(1400, () =>
      terminarMinijuego(this, res.total, `${this.buenas} de ${this.preguntas.length} respuestas buenas${res.contratado ? '\n¡Contratado! +10' : ''}`),
    );
  }

  override update(_t: number, dt: number): void {
    this.reloj += dt;
    this.barra.clear();
    if (this.terminado || this.esperando) return;
    const resta = Math.max(0, this.limite - this.reloj);
    const f = resta / (SEGUNDOS_POR_PREGUNTA * 1000);
    this.barra.fillStyle(0x1b1424, 1).fillRect(104 * E, 110 * E, 252 * E, 5 * E);
    this.barra.fillStyle(f > 0.3 ? 0x8ee07a : 0xff7a6b, 1).fillRect(104 * E, 110 * E, 252 * f * E, 5 * E);
    if (resta <= 0) this.responder(null);
  }
}
