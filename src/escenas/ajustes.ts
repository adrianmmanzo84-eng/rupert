import type Phaser from 'phaser';
import { nuevoEstado } from '../core/estado';
import { guardarPartida, juego } from '../juego';
import { panel } from '../ui/ui';

declare const __VERSION__: string;

/** Ajustes (R020, R024): versión, tutorial, créditos y borrar la partida (con confirmación). */
export function abrirAjustes(esc: Phaser.Scene, alBorrar: () => void): void {
  const cerrar = panel(
    esc,
    'Ajustes',
    [
      { titulo: `Versión ${__VERSION__}`, detalle: 'Rupert: Road to Progress' },
      {
        titulo: 'Tutorial',
        detalle: 'Volver a ver cómo se juega',
        accion: 'Ver',
        alPulsar: () => {
          juego.e.tutorial = false;
          guardarPartida();
          cerrar();
          esc.registry.set('entrando', true);
          esc.scene.start('Hogar');
        },
      },
      { titulo: 'Créditos', detalle: 'Quién hizo el juego', accion: 'Ver', alPulsar: () => creditos(esc) },
      {
        titulo: 'Borrar partida',
        detalle: 'Empezar de cero en este teléfono',
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

function creditos(esc: Phaser.Scene): void {
  panel(
    esc,
    'Créditos',
    [
      { titulo: 'Idea y dirección', detalle: 'LiSaDm' },
      { titulo: 'Programación y diseño', detalle: 'LiSaDm con Claude' },
      { titulo: 'Arte', detalle: 'LiSaDm, con ilustraciones generadas con IA' },
      { titulo: 'Fuente VT323', detalle: 'Peter Hull (SIL Open Font License)' },
      { titulo: 'Motor', detalle: 'Phaser 4 y Capacitor' },
    ],
  );
}

function confirmarBorrar(esc: Phaser.Scene, alTerminar: () => void): void {
  const cerrar = panel(
    esc,
    '¿Borrar la partida?',
    [
      { titulo: 'Se pierden monedas, objetos,', detalle: 'insignias, racha y decoración.' },
      { titulo: 'No se puede deshacer.', detalle: 'Lo aportado al fondo de todos se queda en el fondo.' },
      {
        titulo: 'Sí, empezar de cero',
        accion: 'Borrar',
        alPulsar: () => {
          const viejo = juego.e;
          juego.e = nuevoEstado(Date.now());
          // El fondo y la etapa son de todos: no se borran con la partida.
          juego.e.fondo = viejo.fondo;
          juego.e.etapa = viejo.etapa;
          guardarPartida();
          cerrar();
          alTerminar();
        },
      },
    ],
  );
}
