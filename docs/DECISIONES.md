# Decisiones

## R001 — 2026-11-26 · Stack y resolución
Mismo stack que PIXANIMALS (Phaser 4.2.1, Vite 8, TypeScript). Mundo de 480×270 dibujado a 960×540 para que la cara de Rupert se reconozca (~112 px de alto) y los textos salgan nítidos. Fuente VT323 (licencia OFL).

## R002 — 2026-11-26 · Estilo de Rupert
Se adopta la cara de las etapas 1 a 9 generadas con ChatGPT (ojos grandes, pelo castaño rojizo) y se rehízo la etapa 0 para que coincida. Etapa 7: versión de pelo ordenado; la de pelo de punta queda descartada.

## R003 — 2026-11-26 · Prototipo fase 1
Escena del callejón con menú Mirar / Usar / Hablar, barras de Hambre, Higiene y Ánimo que bajan con el tiempo real (tope de 48 h de ausencia), tienda con monedas, aportes gratis al fondo (10 monedas = 1 PA, tope de 60 PA por día) y minijuego "Buscar en la basura" de 30 s cuyo pago depende del cuidado de Rupert (×0,5 a ×1). La comunidad del fondo se simula (1 PA por minuto) y la primera meta es de 600 PA solo para poder probar el cambio de etapa; en la fase 2 todo esto lo da Firebase.
