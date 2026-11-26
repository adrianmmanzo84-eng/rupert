# Decisiones

## R001 — 2026-11-26 · Stack y resolución
Mismo stack que PIXANIMALS (Phaser 4.2.1, Vite 8, TypeScript). Mundo de 480×270 dibujado a 960×540 para que la cara de Rupert se reconozca (~112 px de alto) y los textos salgan nítidos. Fuente VT323 (licencia OFL).

## R002 — 2026-11-26 · Estilo de Rupert
Se adopta la cara de las etapas 1 a 9 generadas con ChatGPT (ojos grandes, pelo castaño rojizo) y se rehízo la etapa 0 para que coincida. Etapa 7: versión de pelo ordenado; la de pelo de punta queda descartada.

## R003 — 2026-11-26 · Prototipo fase 1
Escena del callejón con menú Mirar / Usar / Hablar, barras de Hambre, Higiene y Ánimo que bajan con el tiempo real (tope de 48 h de ausencia), tienda con monedas, aportes gratis al fondo (10 monedas = 1 PA, tope de 60 PA por día) y minijuego "Buscar en la basura" de 30 s cuyo pago depende del cuidado de Rupert (×0,5 a ×1). La comunidad del fondo se simula (1 PA por minuto) y la primera meta es de 600 PA solo para poder probar el cambio de etapa; en la fase 2 todo esto lo da Firebase.

## R004 — 2026-11-26 · Changas (minijuegos) por lugar de vida
Catálogo en `src/core/minijuegos.ts`: cada changa pertenece a un lugar de vida y solo se juega en sus etapas; al mudarse, cambian. Callejón (etapas 0–2): Buscar en la basura, Juntar para reciclar (hasta etapa 4), Collares de chapitas (hasta etapa 3) y Carrera de ratones; Lavar platos llega en la etapa 1. Plaza: volantes, arreglos, entrevista. Ciudad: reparto en bici. Pieza: cocina. Instituto: exámenes. Taller: reparar el auto. Casa: decorar. El panel "Changas" muestra las de ahora y las próximas bloqueadas. Cada changa también se abre tocando su objeto en la escena (bolsas, tarima, tubería, contenedor).
La carrera de ratones no tiene apuestas: se gana por habilidad (tocar en la zona verde) y paga según el puesto, para no caer en "juego de azar simulado" en la clasificación de edad ni en las políticas de Google Play.
Ratones y chapitas usan arte provisional dibujado por código hasta tener el de ChatGPT.

## R005 — 2026-11-26 · Carrera por patas alternadas y más objetos
La carrera de ratones cambia de mecánica: el medidor con zona verde no funcionaba bien en el celular. Ahora hay dos botones grandes, "Pata izquierda" y "Pata derecha", que responden al apoyar el dedo: alternarlos acelera (+3,2 de impulso por pisada) y repetir la misma pata frena (impulso ×0,6). El impulso se pierde solo (×0,9 cada 100 ms). Los rivales corren cada vez más rápido: 20, 24 y 27 px/s de media en las tres carreras. En la computadora también sirven las flechas.
Reciclaje: 13 objetos (antes 6) en cuatro tachos. Basura: 17 cosas que sirven y 3 que restan (antes 6 y 2); la paloma se va volando al tocarla. Se reutilizan las hojas de objetos de la plaza, la barbería y los accesorios.
Collares: 15 chapitas (colores y dibujos de estrella o punto); la bandeja empieza con 3 y suma una cada dos collares vendidos, hasta 10. Ratones y chapitas siguen dibujados por código, ahora con más detalle y 4 fotogramas de carrera.

## R006 — 2026-11-26 · Arte definitivo de los minijuegos del callejón
Se reemplazan los ratones y las chapitas dibujados por código por arte de ChatGPT (fuentes en `arte/fuentes/`, procesado con `scripts/arte/procesar_minijuegos.py`). Ratones: 4 colores × 4 fotogramas; el gris lleva moño rojo y es el del jugador. Chapitas: 5 colores de la hoja; las otras 10 se tiñen a partir de la plateada y algunas llevan estrella o punto. Reciclaje usa los 4 tachos dibujados y suma 12 objetos (25 en total); el vidrio y el plástico transparentes dejaban ver el magenta del fondo y se pasan a gris azulado. Basura suma 8 hallazgos y 4 cosas que restan (32 en total).
Los minijuegos cuentan su propio tiempo desde que empiezan: el reloj de la escena de Phaser arrastraba el valor anterior al reiniciarla y algunas changas terminaban antes.

## R007 — 2026-11-26 · Respiración por código y siesta
Los cuatro cuadros de "quieto" generados por ChatGPT cambian detalles de la cara, el pelo y el abrigo entre sí, y Rupert parecía temblar. Ahora en reposo se muestra un solo cuadro y la respiración se hace estirando el cuerpo menos del 1 % (un píxel) en un ciclo de 3,2 s. Al moverse, hablar o hacer acciones se usan las animaciones normales.
Siesta (Usar la cama, una vez cada 4 horas, +20 de ánimo): Rupert va a la cama, la escena se oscurece y salen "Z" durante 7 s; tocar la pantalla lo despierta antes. Si no puede dormir, dice cuánto falta. Mientras no haya dibujo de Rupert durmiendo, se tapa con la manta (se oculta); cuando exista `e{etapa}_dormir`, se muestra acostado sobre la cama y respira por código.

## R008 — 2026-11-26 · Modo pruebas
Abriendo el juego con `?pruebas` en el enlace se quitan las esperas de la siesta (4 h) y de la charla que sube el ánimo (1 h), para poder probarlas seguidas. Se indica "MODO PRUEBAS" abajo a la izquierda. No cambia el resto de las reglas ni queda guardado: sin el parámetro, todo vuelve a lo normal.

## R009 — 2026-11-26 · Etapas 1 a 3 de Rupert y Lavar platos
Rupert cambia de aspecto al subir a las etapas 1 (bañado, pelo largo limpio), 2 (pelo corto y afeitado) y 3 (ropa nueva: camisa, campera marrón y pantalón gris). Sprites procesados con `scripts/arte/procesar_rupert.py` desde las hojas de cada etapa. En las etapas 1 y 2 las animaciones de comer y lavarse venían en plano corto y no se usan: Rupert muestra el objeto en la mano mientras habla.
Cada meta cumplida muestra un cartel con su hito (baño, corte de pelo, ropa nueva, etc.).
Nueva changa "Lavar platos" desde la etapa 1 (puerta trasera del bar o panel Changas): se frota con el dedo cada plato o taza hasta limpiarlo; llegan platos sucios cada vez más seguido (de 3,2 s a 1,6 s) y si la pila llega a 10 termina la changa. Plato 3 puntos, taza 2.
Modo pruebas: el panel Aportar suma una fila "+300 PA" sin gastar monedas, para ver los cambios de etapa.
La etapa 3 todavía ocurre en el callejón; la mudanza a la plaza queda para el paso siguiente.
