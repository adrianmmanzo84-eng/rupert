import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Estado } from '../core/estado';
import { planDeAvisos } from '../core/avisos';
import { preferencias } from '../audio/preferencias';

/**
 * Avisos al teléfono (R043): notificaciones locales, programadas por el propio teléfono al salir del juego.
 * No pasan por ningún servidor. Son tres, con la voz de Rupert, y se reprograman cada vez que se sale:
 *  - hambre: cuando el hambre vaya a bajar de 25,
 *  - regalo: al día siguiente a las 10, si no entró antes,
 *  - racha: al día siguiente a las 20, si tiene una racha de 2 días o más que se cortaría.
 * Solo en la app de Android, con permiso y con el ajuste «Avisos» encendido.
 */
const nativo = Capacitor.isNativePlatform();

async function conPermiso(): Promise<boolean> {
  if (!nativo) return false;
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/** Pide el permiso (Android 13+ muestra su propio cartel). Devuelve si quedó concedido. */
export async function pedirPermisoAvisos(): Promise<boolean> {
  if (!nativo) return false;
  try {
    return (await LocalNotifications.requestPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/** Borra los avisos anteriores y programa los nuevos. Se llama al salir del juego. */
export async function programarAvisos(e: Estado): Promise<void> {
  if (!nativo) return;
  try {
    const pendientes = await LocalNotifications.getPending();
    if (pendientes.notifications.length) await LocalNotifications.cancel({ notifications: pendientes.notifications.map((n) => ({ id: n.id })) });
    if (!preferencias().avisos || !(await conPermiso())) return;
    const ahora = Date.now();
    await LocalNotifications.schedule({
      notifications: planDeAvisos(e, ahora).map((a) => ({ id: a.id, title: a.titulo, body: a.cuerpo, schedule: { at: new Date(a.en), allowWhileIdle: false } })),
    });
  } catch {
    /* sin avisos: el juego sigue igual */
  }
}

/** Al volver al juego se borran los avisos (ya no hacen falta: está jugando). */
export async function borrarAvisos(): Promise<void> {
  if (!nativo) return;
  try {
    const pendientes = await LocalNotifications.getPending();
    if (pendientes.notifications.length) await LocalNotifications.cancel({ notifications: pendientes.notifications.map((n) => ({ id: n.id })) });
  } catch {
    /* nada */
  }
}

export const avisosDisponibles = nativo;
