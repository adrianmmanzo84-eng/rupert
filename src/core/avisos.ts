import { CONFIG, type Estado } from './estado';

/** Avisos al teléfono (R043): cuáles tocan y cuándo. La parte que habla con Android está en `src/red/avisos.ts`. */
export interface AvisoPlan {
  id: number;
  titulo: string;
  cuerpo: string;
  en: number;
}

/** Qué avisos tocan y cuándo (pura, para poder probarla). */
export function planDeAvisos(e: Estado, ahora: number): AvisoPlan[] {
  const plan: AvisoPlan[] = [];
  const horasHambre = (e.hambre - 25) / CONFIG.bajaPorHora.hambre;
  if (horasHambre > 1 && horasHambre < 48) {
    plan.push({ id: 1, titulo: 'Rupert tiene hambre', cuerpo: 'Mi estómago hace ruidos que no conocía. ¿Me traes algo? Un sándwich. Media manzana. Una miga.', en: ahora + horasHambre * 3_600_000 });
  }
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  manana.setHours(10, 0, 0, 0);
  plan.push({ id: 2, titulo: 'Tu regalo del día', cuerpo: 'Encontré monedas en el bolsillo. Son tuyas. Hasta me sorprendió tener bolsillo.', en: manana.getTime() });
  if (e.racha >= 2) {
    const noche = new Date(manana);
    noche.setHours(20, 0, 0, 0);
    plan.push({ id: 3, titulo: `Racha de ${e.racha} días`, cuerpo: 'Si no pasas hoy, se corta a la medianoche. Yo no te presiono. Solo te miro fijo.', en: noche.getTime() });
  }
  return plan;
}

