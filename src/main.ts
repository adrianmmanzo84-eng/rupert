import Phaser from 'phaser';
import '@fontsource/vt323/latin-400.css';
import { ALTO, ANCHO, E } from './ui/ui';
import { Arranque } from './escenas/Arranque';
import { Hogar } from './escenas/Hogar';
import { Basura } from './escenas/Basura';
import { Reciclaje } from './escenas/Reciclaje';
import { Collares } from './escenas/Collares';
import { Examenes } from './escenas/Examenes';
import { Entrevista } from './escenas/Entrevista';
import { Volantes } from './escenas/Volantes';
import { Arreglos } from './escenas/Arreglos';
import { Cocina } from './escenas/Cocina';
import { TallerAuto } from './escenas/TallerAuto';
import { Titulo } from './escenas/Titulo';
import { Fondo } from './escenas/Fondo';
import { Pausa } from './escenas/Pausa';
import { Plomeria } from './escenas/Plomeria';
import { Electricidad } from './escenas/Electricidad';
import { Almacen } from './escenas/Almacen';
import { iniciarCompras } from './compras/flujo';
import { iniciarServidor } from './red/servidor';
import { Ratones } from './escenas/Ratones';
import { Platos } from './escenas/Platos';
import { Reparto } from './escenas/Reparto';
import { Visita } from './escenas/Visita';
import { guardarPartida, juego } from './juego';
import { iniciarNativo } from './nativo';

async function iniciar(): Promise<void> {
  // La fuente pixel tiene que estar lista antes de dibujar textos.
  try {
    await document.fonts.load(`${11 * E}px "VT323"`);
  } catch {
    /* si falla, se usa la fuente de respaldo */
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'pantalla',
    width: ANCHO * E,
    height: ALTO * E,
    backgroundColor: '#140e1c',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    scene: [Arranque, Titulo, Fondo, Hogar, Basura, Reciclaje, Collares, Ratones, Platos, Reparto, Visita, Examenes, Entrevista, Volantes, Arreglos, Cocina, TallerAuto, Plomeria, Electricidad, Almacen, Pausa],
  });
  // Acceso para pruebas automáticas en el navegador.
  (window as unknown as { __rupert: Phaser.Game; __partida: typeof juego }).__rupert = game;
  (window as unknown as { __partida: typeof juego }).__partida = juego;
  // Guardar al salir o al pasar a segundo plano.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') guardarPartida();
  });
  window.addEventListener('pagehide', guardarPartida);
  iniciarNativo(game, guardarPartida);
  // Barrio real en el servidor (R022): al abrir y cada minuto.
  iniciarServidor(() => game.events.emit('barrio'));
  // Compras cobradas que quedaron sin entregar (la app se cerró en medio): se entregan al abrir y al volver.
  iniciarCompras(() => {
    const activa = game.scene.getScenes(true)[0];
    if (activa && activa.scene.key !== 'Arranque') activa.scene.restart();
  });
}

void iniciar();
