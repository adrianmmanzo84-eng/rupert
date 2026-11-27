import type Phaser from 'phaser';
import { nuevoEstado } from '../core/estado';
import { MODO_PRUEBAS, guardarPartida, juego } from '../juego';
import { COLOR, E, boton, caja, panel, texto } from '../ui/ui';
import { type Preferencias, cambiarPreferencia, preferencias } from '../audio/preferencias';
import { aplicarPreferencias, sonar } from '../audio/sonido';
import { vibrar } from '../audio/vibrar';

declare const __VERSION__: string;

/** Ajustes (R020, R024): versión, tutorial, créditos y borrar la partida (con confirmación). */
export function abrirAjustes(esc: Phaser.Scene, alBorrar: () => void): void {
  const cerrar = panel(
    esc,
    'Ajustes',
    [
      { titulo: `Versión ${__VERSION__}`, detalle: 'Rupert: Road to Progress' },
      { titulo: 'Sonido y vibración', detalle: resumenSonido(), accion: 'Cambiar', alPulsar: () => ajustesSonido(esc) },
      {
        titulo: 'Tutorial',
        detalle: 'Volver a ver cómo se juega',
        accion: 'Ver',
        alPulsar: () => {
          juego.e.tutorial = false;
          juego.e.consejos = [];
          guardarPartida();
          cerrar();
          esc.registry.set('entrando', true);
          esc.scene.start('Hogar');
        },
      },
      { titulo: 'Créditos', detalle: 'Quién hizo el juego', accion: 'Ver', alPulsar: () => creditos(esc) },
      ...(MODO_PRUEBAS && !juego.enLinea
        ? [{ titulo: 'Ir a una etapa', detalle: 'Solo en modo pruebas', accion: 'Elegir', alPulsar: () => elegirEtapa(esc, () => { cerrar(); alBorrar(); }) }]
        : []),
      {
        titulo: 'Borrar partida',
        detalle: juego.enLinea ? 'Empezar de cero en este teléfono' : 'Empezar de cero, desde la etapa 0',
        accion: 'Borrar',
        alPulsar: () => confirmarBorrar(esc, () => {
          cerrar();
          alBorrar();
        }),
      },
    ],
    'Rupert es un personaje de ficción. Los aportes son compras de contenido del juego.',
  );
}

function resumenSonido(): string {
  const p = preferencias();
  const si = (b: boolean) => (b ? 'sí' : 'no');
  return `Música: ${si(p.musica)} · Efectos: ${si(p.efectos)} · Vibración: ${si(p.vibracion)}`;
}

/** Música, efectos y vibración, por separado (R042). Se guardan en el teléfono, no en la partida. */
function ajustesSonido(esc: Phaser.Scene): void {
  const p = preferencias();
  const fila = (k: keyof Preferencias, nombre: string, detalle: string) => ({
    titulo: `${nombre}: ${p[k] ? 'encendida' : 'apagada'}`.replace('Efectos: encendida', 'Efectos: encendidos').replace('Efectos: apagada', 'Efectos: apagados'),
    detalle,
    accion: p[k] ? 'Apagar' : 'Encender',
    alPulsar: () => {
      const nuevas = cambiarPreferencia(k, !p[k]);
      aplicarPreferencias(nuevas);
      cerrar();
      ajustesSonido(esc);
      if (k === 'efectos' && nuevas.efectos) sonar('moneda');
      if (k === 'vibracion' && nuevas.vibracion) vibrar('fuerte');
    },
  });
  const cerrar = panel(esc, 'Sonido y vibración', [
    fila('musica', 'Música', 'Un tema por lugar y otro para las changas'),
    fila('efectos', 'Efectos', 'Monedas, aciertos, golpes y la voz de Rupert'),
    fila('vibracion', 'Vibración', 'En aciertos, golpes y metas'),
  ]);
}

function creditos(esc: Phaser.Scene): void {
  panel(
    esc,
    'Créditos',
    [
      { titulo: 'Idea y dirección', detalle: 'LiSaDm' },
      { titulo: 'Programación y diseño', detalle: 'LiSaDm con Claude' },
      { titulo: 'Arte', detalle: 'LiSaDm, con ilustraciones generadas con IA' },
      { titulo: 'Fuente VT323', detalle: 'Peter Hull (SIL Open Font License)' },
      { titulo: 'Música y sonido', detalle: 'Sintetizados en el juego (provisorios)' },
      { titulo: 'Motor', detalle: 'Phaser 4 y Capacitor' },
    ],
  );
}

export function confirmarBorrar(esc: Phaser.Scene, alTerminar: () => void): void {
  const cerrar = panel(
    esc,
    '¿Borrar la partida?',
    [
      { titulo: 'Se pierden monedas, objetos,', detalle: 'insignias, racha y decoración.' },
      {
        titulo: 'No se puede deshacer.',
        detalle: juego.enLinea ? 'Lo aportado al fondo del barrio se queda en el barrio.' : 'Rupert vuelve a empezar en el callejón.',
      },
      {
        titulo: 'Sí, empezar de cero',
        accion: 'Borrar',
        alPulsar: () => {
          const viejo = juego.e;
          juego.e = nuevoEstado(Date.now());
          // Con servidor, el fondo y la etapa son del barrio: no se borran con la partida (y el barrio se
          // vuelve a leer al sincronizar). Sin servidor el barrio es solo de este teléfono: empieza de cero (R027).
          if (juego.enLinea) {
            juego.e.fondo = viejo.fondo;
            juego.e.etapa = viejo.etapa;
            juego.e.barrio = viejo.barrio;
          }
          guardarPartida();
          cerrar();
          alTerminar();
        },
      },
    ],
  );
}

/** Modo pruebas sin servidor: saltar a cualquier etapa (fondo en cero) para probarla. */
function elegirEtapa(esc: Phaser.Scene, alElegir: () => void): void {
  const capa = esc.add.container(0, 0).setDepth(5200);
  const fondo = esc.add.rectangle(0, 0, 480 * E, 270 * E, 0x0b0812, 0.6).setOrigin(0).setInteractive();
  const g = esc.add.graphics();
  caja(g, 110, 70, 260, 120, COLOR.panel);
  capa.add([fondo, g, texto(esc, 240, 76, 'Ir a la etapa...', { tam: 14, color: COLOR.oro }).setOrigin(0.5, 0)]);
  for (let n = 0; n <= 9; n++) {
    const b = boton(esc, 122 + (n % 5) * 48, 100 + Math.floor(n / 5) * 32, 42, 26, String(n), () => {
      juego.e.etapa = n;
      juego.e.fondo = 0;
      guardarPartida();
      capa.destroy();
      alElegir();
    }, 14);
    b.activar(n !== juego.e.etapa);
    capa.add(b.cont);
  }
  capa.add(boton(esc, 200, 166, 80, 18, 'Cancelar', () => capa.destroy(), 11).cont);
}
