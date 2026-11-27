import Phaser from 'phaser';
import { CARTA_EPILOGO, CIERRE_EPILOGO, EPILOGO, type PaginaEpilogo } from '../core/textos';
import { guardarPartida, juego } from '../juego';
import { ALTO, ANCHO, COLOR, E, boton, texto } from '../ui/ui';
import { confeti, estallido } from '../ui/efectos';

/** Milisegundos por letra al escribir el texto de cada página. */
const MS_LETRA = 28;

/**
 * Epílogo de la primera parte (R041). Páginas con un recuerdo cada una (fondo que se mueve despacio, el Rupert de
 * esa etapa y el texto que se escribe solo), la carta misteriosa y el cartel «Fin de la primera parte».
 * Tocar completa el texto o pasa de página; «Saltar» va directo al cartel final.
 * `volver`: a qué escena ir al terminar ('Hogar' tras cumplir la última meta, 'Titulo' si se mira de nuevo).
 */
export class Epilogo extends Phaser.Scene {
  private pagina = 0;
  private capa!: Phaser.GameObjects.Container;
  private cuerpo!: Phaser.GameObjects.Text;
  private completo = '';
  private escribiendo?: Phaser.Time.TimerEvent;
  private volver = 'Titulo';
  private enCierre = false;
  private ocupado = false;

  constructor() {
    super('Epilogo');
  }

  create(datos: { volver?: string }): void {
    this.volver = datos?.volver ?? 'Titulo';
    this.pagina = 0;
    this.enCierre = false;
    this.ocupado = false;
    juego.e.finalVisto = true;
    guardarPartida();
    this.cameras.main.setBackgroundColor('#0b0812');
    this.mostrar(EPILOGO[0]);
    // El toque sobre «Saltar» no cuenta como «seguir».
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < 26 * E && p.x > (ANCHO - 74) * E) return;
      this.tocar();
    });
    const saltar = boton(this, ANCHO - 70, 6, 62, 18, 'Saltar', () => this.cierre(), 10);
    saltar.cont.setDepth(100);
    this.input.keyboard?.on('keydown-SPACE', () => this.tocar());
  }

  private tocar(): void {
    if (this.enCierre || this.ocupado) return;
    if (this.escribiendo) {
      this.escribiendo.remove();
      this.escribiendo = undefined;
      this.cuerpo.setText(this.completo);
      return;
    }
    this.pagina += 1;
    if (this.pagina >= EPILOGO.length) {
      this.cierre();
      return;
    }
    this.ocupado = true;
    this.cameras.main.fadeOut(350, 11, 8, 18);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.capa.destroy();
      this.mostrar(EPILOGO[this.pagina]);
      this.ocupado = false;
    });
  }

  private mostrar(p: PaginaEpilogo): void {
    this.cameras.main.fadeIn(500, 11, 8, 18);
    this.capa = this.add.container(0, 0);
    // Fondo un poco más grande que la pantalla, que se desliza despacio (efecto «documental»).
    const fondo = this.add.image((ANCHO / 2) * E, (ALTO / 2) * E, p.fondo).setScale(E * 1.06);
    this.capa.add(fondo);
    this.tweens.add({ targets: fondo, scale: E * 1.12, x: fondo.x + (this.pagina % 2 ? -8 : 8) * E, duration: 9000, ease: 'Sine.easeInOut' });
    if (p.etapa !== undefined) {
      const clave = `e${p.etapa}_quieto_frente`;
      if (this.textures.exists(clave)) {
        const r = this.add.sprite((p.x ?? 240) * E, (p.y ?? 240) * E, clave, 0).setOrigin(0.5, 1).setScale(E * (p.escala ?? 1));
        if (this.anims.exists(clave)) r.play(clave);
        r.setAlpha(0);
        this.tweens.add({ targets: r, alpha: 1, y: r.y, duration: 500, delay: 200 });
        this.capa.add(r);
      }
    }
    if (p.noche) {
      const noche = this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x0a0a2a, 0.62).setOrigin(0);
      this.capa.add(noche);
    } else {
      // Viñeta suave en los bordes.
      const v = this.add.graphics();
      v.fillStyle(0x000000, 0.35).fillRect(0, 0, ANCHO * E, 10 * E).fillRect(0, (ALTO - 10) * E, ANCHO * E, 10 * E);
      this.capa.add(v);
    }
    if (p.carta) this.carta();
    // Texto arriba, para no tapar a Rupert.
    const caja = this.add.graphics();
    caja.fillStyle(0x140e1c, 0.88).fillRoundedRect(20 * E, 10 * E, (ANCHO - 100) * E, 66 * E, 4 * E);
    caja.lineStyle(E, 0xffb347, 0.6).strokeRoundedRect(20 * E, 10 * E, (ANCHO - 100) * E, 66 * E, 4 * E);
    this.cuerpo = texto(this, 30, 16, '', { tam: 12, ancho: ANCHO - 120 });
    const num = texto(this, ANCHO - 86, 64, `${this.pagina + 1}/${EPILOGO.length}`, { tam: 9, color: '#8a7f99' }).setOrigin(1, 0);
    const sigue = texto(this, ANCHO / 2, ALTO - 14, 'Toca para seguir', { tam: 10, color: '#c9b9a6' }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: sigue, alpha: 1, delay: 2500, duration: 500, yoyo: true, repeat: -1, hold: 700 });
    this.capa.add([caja, this.cuerpo, num, sigue]);
    this.escribir(p.texto);
  }

  /** Escribe el texto letra por letra. */
  private escribir(s: string): void {
    this.completo = s;
    let n = 0;
    this.escribiendo = this.time.addEvent({
      delay: MS_LETRA,
      repeat: s.length - 1,
      callback: () => {
        n += 1;
        this.cuerpo.setText(s.slice(0, n));
        if (n >= s.length) this.escribiendo = undefined;
      },
    });
  }

  /** La carta baja girando hasta el centro, sobre la caja de cartón. */
  private carta(): void {
    const cx = (ANCHO / 2) * E;
    const caja = this.add.image(cx, 262 * E, 'carton').setOrigin(0.5, 1);
    caja.setScale((44 * E) / caja.height);
    const papel = this.add.container(cx, -80 * E);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRect(-86 * E + 4 * E, -50 * E + 4 * E, 172 * E, 100 * E);
    g.fillStyle(0xf3e6c8, 1).fillRect(-86 * E, -50 * E, 172 * E, 100 * E);
    g.lineStyle(E, 0xc9b28a, 1).strokeRect(-86 * E, -50 * E, 172 * E, 100 * E);
    for (let k = 0; k < 8; k++) g.fillStyle(0xd9c7a2, 1).fillRect(-78 * E, (-34 + k * 11) * E, 156 * E, 1);
    const t = this.add.text(-78 * E, -44 * E, CARTA_EPILOGO, { fontFamily: '"VT323", monospace', fontSize: `${11 * E}px`, color: '#3a2a20', lineSpacing: 1 * E });
    const llave = this.add.image(70 * E, 38 * E, 'llave').setScale(1.6).setAngle(-25);
    papel.add([g, t, llave]);
    papel.setAngle(-14);
    this.capa.add([caja, papel]);
    this.tweens.add({ targets: papel, y: 150 * E, angle: 3, duration: 1300, delay: 900, ease: 'Bounce.easeOut' });
    this.time.delayedCall(2200, () => estallido(this, cx + 70 * E, 198 * E, { textura: 'fx_estrella', colores: [0xffe9a0, 0xd9a441], cantidad: 8, velocidad: [20, 60], vida: 700 }));
  }

  /** Cartel final: fin de la primera parte y la promesa de la segunda. */
  private cierre(): void {
    if (this.enCierre) return;
    this.enCierre = true;
    this.escribiendo?.remove();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.children.removeAll(true);
      this.cameras.main.fadeIn(900, 0, 0, 0);
      this.add.rectangle(0, 0, ANCHO * E, ALTO * E, 0x07050c, 1).setOrigin(0);
      // Estrellitas que titilan en el fondo.
      for (let i = 0; i < 40; i++) {
        const s = this.add.rectangle(Phaser.Math.Between(0, ANCHO) * E, Phaser.Math.Between(0, ALTO) * E, E, E, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
        this.tweens.add({ targets: s, alpha: 0.05, duration: Phaser.Math.Between(700, 2200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
      }
      const c = CIERRE_EPILOGO;
      const titulo = texto(this, ANCHO / 2, 46, c.titulo, { tam: 24, color: COLOR.oro }).setOrigin(0.5).setAlpha(0).setScale(0.6);
      this.tweens.add({ targets: titulo, alpha: 1, scale: 1, duration: 700, delay: 400, ease: 'Back.easeOut' });
      const frase = texto(this, ANCHO / 2, 96, c.frase, { tam: 13, alinear: 'center', ancho: 400 }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: frase, alpha: 1, duration: 900, delay: 1400 });
      const sigue = texto(this, ANCHO / 2, 146, c.sigue, { tam: 15, color: '#9fe8ff', alinear: 'center', ancho: 420 }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: sigue, alpha: 1, duration: 900, delay: 2800 });
      this.tweens.add({ targets: sigue, scale: 1.04, duration: 1100, yoyo: true, repeat: -1, delay: 3700, ease: 'Sine.easeInOut' });
      const gracias = texto(this, ANCHO / 2, 180, c.gracias, { tam: 12, color: '#c9b9a6' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: gracias, alpha: 1, duration: 700, delay: 3800 });
      this.time.delayedCall(3000, () => confeti(this, (ANCHO / 2) * E, 40 * E, 50));
      this.time.delayedCall(4400, () => {
        boton(this, ANCHO / 2 - 60, 212, 120, 26, this.volver === 'Hogar' ? 'A mi casa' : 'Volver', () => this.salir(), 13);
      });
    });
  }

  private salir(): void {
    this.cameras.main.fadeOut(500);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(this.volver));
  }
}
