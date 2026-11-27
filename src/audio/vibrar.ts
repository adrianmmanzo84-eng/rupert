import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { preferencias } from './preferencias';

/**
 * Vibración (R042): en la app usa el motor háptico del teléfono; en el navegador, `navigator.vibrate` si existe.
 * suave = un acierto · fuerte = un golpe o error · logro = meta cumplida o récord.
 */
export type Vibracion = 'suave' | 'fuerte' | 'logro';

const nativo = Capacitor.isNativePlatform();
let ultima = 0;

export function vibrar(v: Vibracion): void {
  if (!preferencias().vibracion) return;
  const ahora = performance.now();
  // Una ráfaga de aciertos no puede volverse un zumbido continuo.
  if (v === 'suave' && ahora - ultima < 80) return;
  ultima = ahora;
  if (nativo) {
    if (v === 'logro') void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    else void Haptics.impact({ style: v === 'fuerte' ? ImpactStyle.Heavy : ImpactStyle.Light }).catch(() => undefined);
    return;
  }
  const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try {
    n.vibrate?.(v === 'logro' ? [40, 60, 80] : v === 'fuerte' ? 60 : 12);
  } catch {
    /* sin vibración */
  }
}
