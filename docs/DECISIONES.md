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

## R010 — 2026-11-26 · Rupert se muda y Reparto en bici
Sprites de las etapas 4 a 9 procesados. En algunas hojas, ChatGPT dibujó hablar, comer o lavarse en plano corto (cabeza y torso más grandes); revisadas a ojo, no se usan (lista `PLANO_CORTO` en `scripts/arte/procesar_rupert.py`): e1 y e2 comer y lavarse, e5 hablar y lavarse, e7 lavarse, e9 comer. Sin esa animación, Rupert muestra el objeto en la mano o habla quieto. Se probaron medidas automáticas (ancho del cuerpo, de la cabeza, distancia a la bufanda) y no fueron fiables.
La escena principal pasa a ser `Hogar` y se arma con los datos de `src/core/lugares.ts`: callejón (0–2), plaza (3–4), ciudad (5), pieza (6), instituto (7), taller con el auto (8) y casa propia (9). Cada lugar tiene sus zonas para Mirar y Usar, objetos del suelo, suelo transitable y, donde corresponde, lugar para la siesta (cartón, banco, cama, puerta de casa); en la ciudad, el instituto y el taller Rupert explica que ahí no duerme. Al cumplir una meta que cambia de lugar, Rupert anuncia la mudanza y la escena se rearma en el lugar nuevo.
Nueva changa "Reparto en bici" (etapas 5 y 6; bici de la ciudad o panel Changas): la calle avanza (de 90 a 170 px/s), tocar la pantalla salta; pedidos +5, monedas +2, cajas y cáscaras −4 con un segundo de inmunidad. Bici y piernas dibujadas por código con Rupert repartidor encima, hasta tener el dibujo de Rupert en bici.
Para pruebas automáticas en el navegador se exponen `window.__rupert` (juego de Phaser) y `window.__partida` (estado).

## R011 — 2026-11-26 · Tamaño de Rupert según el lugar
Los fondos de interiores están dibujados más cerca que los de exteriores. Cada escenario tiene ahora un tamaño para Rupert (`escala` en `src/core/lugares.ts`), calculado con objetos de medida conocida: pieza ×1,6 (la mesa mide unos 85 px y una mesa real unos 75 cm) e instituto ×1,35 (pupitres). Callejón, plaza, ciudad, taller y casa quedan en ×1. En esos dos lugares se bajó el suelo transitable y se reubicaron las zonas y los objetos del suelo.
Reparto en bici: ciclista ×2,05 (antes ×1,35), obstáculos y pedidos más grandes y salto más alto (−360) para que se puedan saltar a máxima velocidad; un jugador automático completó la partida con 4 choques.
El globo de texto de Rupert ya no tapa la barra del fondo cuando Rupert es alto.

## R012 — 2026-11-26 · Pizarrón adulto en el instituto
Los dibujos de tiza del fondo del instituto (árbol, nube, montañas, figuras geométricas) hacían que el aula pareciera de primaria. `scripts/arte/procesar_escena.py` los borra (la tiza pasa al verde del pizarrón, con un rastro leve como de borrado) y el juego escribe encima, con datos de `src/core/lugares.ts` (`tiza`): la ecuación x² − 5x + 6 = 0 factorizada con sus soluciones, el gráfico de esa parábola cortando el eje en 2 y 3, y una cuenta de ahorro (1200 − 950 = 250). Todo queda por debajo de y = 38 para que no lo tape la barra superior.

## R013 — 2026-11-26 · Ciclista dibujado, casa decorable y visitas de hitos
Reparto en bici usa los 4 fotogramas de Rupert pedaleando generados con ChatGPT (104 px de alto); la animación se acelera con la calle.
Etapa 9: Rupert vive en el interior de la casa (fondo `casa_interior`, Rupert ×1,3 por la mesa). Siete huecos (dos estantes, dos mesadas, la mesa y dos rincones del suelo) donde se ponen objetos comprados con monedas (`src/core/decoracion.ts`, 15 objetos de 25 a 120 monedas, con las imágenes que ya existían). Cada objeto tiene su alto real en la escena y cada hueco un alto máximo. Un objeto comprado se puede sacar y volver a poner gratis en otro hueco. El exterior de la casa pasa a ser el jardín: se sale por el borde derecho del interior y se entra por la puerta; la siesta se duerme bajo el árbol del jardín. "Decorar la casa" deja de ser una changa.
Visitas de hitos (`VISITAS` en `lugares.ts`): al llegar a la etapa 2 Rupert aparece en la barbería y en la 4 en la biblioteca, con un cartel; tocar vuelve al hogar.

## R014 — 2026-11-26 · La casa solo se decora con electrodomésticos
Los objetos de los minijuegos (radio vieja, osito, flores, libros...) quedaban mal puestos en la casa y dejan de venderse. El catálogo pasa a ser de 9 electrodomésticos y objetos de casa dibujados para eso (heladera, televisor, lámpara de pie, microondas, cafetera, tostadora, planta, reloj y radiocasete), de 60 a 300 monedas, cada uno con su lugar y su alto real. Solo se ofrecen los que tienen imagen cargada; mientras no llegue la hoja `electrodomesticos.png`, Rupert avisa que todavía no hay nada para poner. Las partidas guardadas olvidan objetos que ya no están en el catálogo.

## R015 — 2026-11-26 · Electrodomésticos en la casa
Hoja de 9 electrodomésticos de ChatGPT procesada (`arte/fuentes/electrodomesticos.png`, guardados a 64 px). Altos en la escena corregidos a medidas reales con la regla de la mesa (1 px = 1,25 cm): heladera 136, lámpara de pie 118, televisor y planta 40, cafetera 28, microondas 24, reloj y radiocasete 20, tostadora 16. Los huecos del suelo admiten hasta 140 px y las mesadas hasta 42. Los íconos del panel se ajustan a una casilla de 20 px.
Ajuste (v0.8.3): cada rincón del suelo tiene su mueble fijo, la lámpara a la izquierda y la heladera a la derecha. El televisor va solo en mesadas y la planta solo en la mesa, más chica (22 px). Si una partida vieja tiene un objeto en un hueco donde ya no va, ese objeto no se dibuja y sigue guardado.

## R016 — 2026-11-26 · Changa Exámenes de ingenio (etapas 7 a 9)
Un minuto de acertijos con cuatro opciones: cuentas, series, porcentajes y problemas de plata (cafés, ahorro, vuelto). Se generan al azar y suben de nivel cada 3 aciertos y con la etapa (la 9 empieza dos niveles más arriba). Cada acierto da 4 puntos más 1 por cada acierto seguido (hasta +4); un error resta 2 y muestra la respuesta correcta. Sin dibujos nuevos: usa el fondo del lugar.

## R017 — 2026-11-26 · Changa Entrevista de trabajo (etapa 4)
Cinco preguntas al azar de un banco de 10, cada una con tres respuestas en orden mezclado: buena (10 puntos), regular (4) y mala (0, casi siempre graciosa). Hay 12 segundos por pregunta: si se acaba el tiempo, cuenta 0 y el entrevistador dice que Rupert se quedó sin palabras. Con 40 puntos o más (4 respuestas buenas) lo contratan y gana 10 puntos extra. El entrevistador lo trata de usted. Mientras no llegue el dibujo del entrevistador, se juega con el fondo de la plaza y Rupert a la izquierda.
Ajuste (v0.9.2): el banco de la entrevista pasa a 30 preguntas. El juego recuerda las 20 últimas que salieron durante la sesión y elige primero las que no están entre ellas, así que en 4 entrevistas seguidas no se repite ninguna.

## R018 — 2026-11-26 · Las cuatro changas que faltaban, y arte para la entrevista
Seis hojas de ChatGPT procesadas con `scripts/arte/procesar_changas.py`: cocina, oficina, entrevistador, arreglos, peatones y motor. Las herramientas llevan el prefijo `herr_` porque `llave` ya era un objeto de la basura.
- **Repartir volantes (etapas 3 y 4):** los peatones cruzan la plaza y se los toca cuando pasan por la zona amarilla frente a Rupert. Un volante entregado da +3; tocar lejos de la zona resta 1; tocar al joven con auriculares o a la corredora resta 2. Tres de cada cuatro peatones aceptan el volante, y cada vez pasa gente más seguido.
- **Changas de arreglos (etapas 3 a 5):** el cliente cuenta qué se rompió y hay que elegir una de 4 herramientas. Un arreglo da 5, o 7 si se hace en menos de 3 s; la herramienta equivocada resta 2.
- **Cocinar recetas (etapas 6 a 9):** 5 recetas. Se elige el utensilio y después los ingredientes en el orden de la tarjeta. Un error resta 3 y obliga a empezar la receta de nuevo; cada plato da 4 por ingrediente más 2.
- **Reparar el auto (etapas 8 y 9):** se toca en el motor la pieza gastada y después su repuesto nuevo. Cada auto trae de 1 a 4 piezas gastadas, según los autos ya arreglados y la etapa, y da 6 por pieza más 2.
- **Entrevista:** pasa a jugarse en la oficina; el entrevistador mueve la boca al preguntar y reacciona contento, neutral o serio según la respuesta.
Con esto, todas las changas del catálogo se pueden jugar.

## R019 — 2026-11-26 · App de Android (Capacitor)
- El juego web (dist/) va dentro de la app, así que se juega sin internet.
- Paquete PROVISORIO `com.rupert.roadtoprogress`, nombre visible «Rupert». El paquete no se puede cambiar después de publicar en Google Play: hay que confirmarlo antes.
- Pantalla horizontal fija y modo inmersivo: las barras del sistema aparecen al deslizar.
- Ícono adaptable y pantalla de inicio hechos con el retrato de `icono_512.png`.
- Botón Atrás del teléfono:
  - cierra el panel o el menú abierto, o despierta a Rupert de la siesta;
  - en una changa o una visita, vuelve al hogar sin cobrar;
  - en el hogar sin nada abierto, minimiza la app.
- La partida se guarda también al pasar a segundo plano.
- Versión de la app = versión del juego (versionCode = mayor×1 000 000 + menor×1000 + parche).
- APK de prueba: lo compila GitHub Actions (`android.yml`) en cada push y lo deja en Releases «android-prueba». Se firma con una llave de prueba fija (`android/app/prueba.keystore`), así cada versión se instala encima de la anterior. Esa llave NO es la de Google Play: la de Play se crea al publicar y no va al repositorio.

## R020 — 2026-11-26 · Pantallas de título, fondo y ajustes; compras con Google Play
- **Título:** el juego ahora abre aquí. Muestra a Rupert en su lugar actual, la próxima meta con su barra, la racha y lo aportado, y los botones Jugar, Fondo y Ajustes. En el hogar, el botón «Menú» vuelve al título. El botón Atrás va del hogar al título, y en el título minimiza la app.
- **Fondo de Rupert:** pantalla completa que reemplaza al panel de antes.
  - Arriba, la meta con su barra; se aclara que en el prototipo el resto del mundo está simulado.
  - Pestaña Aportar: monedas → PA, con el tope diario visible.
  - Pestaña Ayudas: compras.
  - Pestaña Insignias.
- **Insignias:** 4 se ganan gratis por PA aportados en total (10, 100, 500 y 2000) y 4 con compras (Bronce, Plata, Oro y Marco dorado). Por ahora se dibujan como medallas con formas, hasta que haya arte propio.
- **Ajustes:** versión, créditos y borrar la partida con confirmación. El fondo y la etapa son de todos, así que no se borran.
- **Productos** (ids para Play Console):
  - ayuda_pequena: 100 PA, 2 sándwiches e insignia Bronce.
  - ayuda_mediana: 330 PA, 2 sopas, 2 cafés, 300 monedas e insignia Plata.
  - ayuda_grande: 600 PA, pack de comida y aseo, 800 monedas e insignia Oro.
  - monedas_1000: 1000 monedas.
  - pase_temporada: 200 PA, doble de monedas en changas hasta la próxima meta y Marco dorado.
  - Todos son consumibles. El pase no se vende dos veces en la misma meta. Máximo 5 compras por día.
  - La ropa cosmética que nombra el documento de concepto queda para cuando haya arte; mientras tanto, esas ayudas dan monedas y objetos.
- **Flujo de compra:** confirmación con precio, lo que se recibe y los PA → ventana de pago de Google Play → acreditar y guardar → consumir. Cada recibo se acredita una sola vez. Las compras que quedaron sin entregar se entregan al abrir la app o al volver a ella.
- **Dónde se cobra:** con Google Play solo en la app publicada. En el APK de prueba y en la web con ?pruebas la compra es simulada y no cobra nada. En la web normal no se vende nada.
- **Pendiente para la fase 2:** los PA comprados quedan anotados en `paraServidor`, para mandarlos al servidor y verificar cada compra con la API de Google Play antes de sumarla al fondo mundial.

## R021 — 2026-11-26 · Barrios: grupos con cupo, cada uno con su propio Rupert
El autor aceptó la propuesta completa:
- En vez de un único fondo mundial, cada **barrio** (grupo de jugadores) tiene su propio Rupert, su fondo y sus metas, y todos recorren las mismas etapas.
- Cupo de **500 vecinos**. Cuando todos los barrios están llenos, el servidor abre uno nuevo. Un jugador nuevo va al barrio más antiguo que tenga lugar.
- Un vecino que pasa **30 días sin entrar** libera su lugar. Si vuelve, sigue en su barrio aunque se pase del cupo.
- Asignación automática por ahora. Más adelante, unirse al barrio de un amigo con un código.
- Un barrio que termina la etapa 9 pasa a temporadas propias. La prueba cerrada usa un barrio de prueba.
- Las metas se calculan según el cupo: PA por vecino [10, 30, 60, 100, 160, 240, 360, 520, 800] × 500, que da las metas del documento de concepto (5.000 … 400.000).
- En el prototipo, el resto del barrio se simula: 384 vecinos activos que aportan 8 PA por minuto, alrededor de 11.500 por día.
- En pantalla se ve «Barrio 1». En modo pruebas, el botón de prueba suma un cuarto de la meta por toque.
- El diseño del servidor (datos y funciones) está en `docs/SERVIDOR.md`.
- Interpretado así: «comparten el objetivo» significa que todos los barrios persiguen las mismas metas. Un evento común entre barrios se puede sumar después.

## R022 — 2026-11-26 · Servidor gratis: Cloudflare Workers + D1
- **Plataforma:** el autor prefiere no usar Firebase Blaze, que pide tarjeta, así que el servidor de barrios va en Cloudflare con el plan gratuito. Ese plan da 100.000 pedidos por día al Worker y, en D1, 5 millones de filas leídas y 100.000 escritas por día, con 5 GB de almacenamiento. Por ahora no se usa Firebase; se suma más adelante, gratis, para los avisos al teléfono.
- **Cuentas:** anónimas. El servidor genera el id y la clave, y guarda solo el hash de la clave. Máximo 10 cuentas nuevas por IP y por día.
- **Aportes:** con tope de 60 PA por día (medido en hora de Argentina). Un aporte reenviado por un corte de red no se suma dos veces. Las metas se cierran en el servidor con un control de concurrencia y el sobrante pasa a la meta siguiente.
- **Barrio de prueba:** id 0, con cupo 20. Ahí van la web con ?pruebas, el modo desarrollo y el APK de prueba.
- **En el juego:** sincroniza al abrir, cada minuto y al volver a la app. Los aportes sin red quedan pendientes y se reenvían. Con conexión, el fondo y la etapa son los del servidor y no se simula nada; sin servidor o sin red, sigue con el barrio simulado. El botón de prueba del fondo se oculta con conexión.
- **Publicación:** la hace el flujo `servidor.yml` con el secreto `CLOUDFLARE_API_TOKEN`, que guarda el autor. Detalle en `docs/SERVIDOR.md`.

## R023 — 2026-11-26 · Pausa en las changas
- **Botón:** todas las changas tienen un botón de pausa «II» arriba al centro (en `montarMinijuego`).
- **Qué congela:** la changa entera (su reloj, temporizadores, animaciones y física), y abre la escena `Pausa` encima.
- **Opciones:** Continuar retoma la changa tal como estaba. «Salir con Rupert» vuelve al hogar sin cobrarla, y la pantalla lo avisa.
- **Pausa sola:** la changa también se pausa si la app pasa a segundo plano. En el teléfono, el botón Atrás pausa la changa, y en la pantalla de pausa la retoma.
- **Changa terminada:** el botón de pausa se oculta.

## R024 — 2026-11-26 · Tutorial de comandos
- **Cuándo aparece:** al entrar a jugar con una partida nueva o borrada. Las partidas guardadas de antes no lo muestran solas.
- **Formato:** 10 pasos. Cada uno oscurece la pantalla salvo la zona que explica (marco amarillo que late) y muestra un cartel con Siguiente y Saltar. Mientras está abierto no se puede tocar el juego.
- **Pasos:** saludo de Rupert, barras de necesidades, fondo del barrio, monedas, caminar tocando el suelo, explorar con Mirar y Usar (sobre una cosa de la escena que inicia una changa), tocar a Rupert para hablar, botones de abajo, Menú y pausa, y cierre (regalo diario, racha y monedas escondidas).
- **Cómo se maneja:**
  - En el teléfono, Atrás lo salta.
  - En Ajustes, «Tutorial → Ver» lo vuelve a mostrar.
  - Al terminarlo o saltarlo queda anotado en la partida (`tutorial`).

## R025 — 2026-11-26 · Correcciones de las pruebas del autor y más ritmo
- **Llave en la mano de Rupert:** la animación «usar» (agacharse a recoger) traía una llave dibujada en las 10 etapas. `scripts/arte/quitar_llave.py` la borra: quita las manchas sueltas del piso, borra el dorado de la franja de abajo en el cuadro agachado y reemplaza el cuadro «levantando la llave» por el primero limpio.
- **Cocina:** los ingredientes ya no quedan chiquitos encima de la olla. Ahora caen dentro, la olla rebota y sale vapor; la tarjeta de la receta marca lo puesto.
- **Bici:** botón «Acelerar» que se mantiene apretado (también con la flecha derecha). Mientras se acelera, la calle va un 60 % más rápido, aparecen líneas de velocidad y los pedidos y monedas valen el doble. El botón «Saltar» queda junto a él; tocar en otro lado también salta.
- **Taller:** las piezas gastadas se generan a partir de las nuevas con `scripts/arte/gastar_piezas.py`: el mismo dibujo con óxido y mugre, más un detalle propio de cada pieza (sulfato en la batería, hollín en la bujía, rajadura en la manguera...). Cada pieza montada tiene su tamaño, para llenar su hueco en el motor.
- **Ritmo por etapa:** `ritmoDeEtapa` = 1,15 + 0,05 × etapa. Acelera la basura, el reciclaje, los platos, los rivales de la carrera de ratones (raíz del ritmo), los volantes y la bici.
- **Combo de aciertos seguidos:** ×1,5 desde 3, ×2 desde 6 y ×2,5 desde 10. Lo tienen la basura, los collares, los volantes, los arreglos, la cocina, el taller y las dos changas nuevas de rompecabezas.
- **Arreglos y cocina:** tiempo límite por pedido, con una barra de paciencia o de cocción. Si se vacía, el cliente se va o la comida se pasa: resta y corta el combo.

## R026 — 2026-11-26 · Tres changas nuevas: plomería, electricidad y almacén
Las pidió el autor, con la consigna de que enganchen. Su lógica está en `src/core/rompecabezas.ts`, con pruebas.
- **Changa de plomería (etapas 5 a 9):** se tocan los caños para girarlos hasta llevar el agua de la canilla al desagüe. El agua avanza en vivo por los caños conectados.
  - Cada nivel tiene solución garantizada: se arma a partir de un camino al azar.
  - Al resolverlo da +6 s, y la cañería siguiente es más grande (de 4×3 a 7×5).
  - Puntos por tamaño, más un extra por rapidez.
- **Changa de electricidad (etapas 6 a 9):** se arrastra desde cada enchufe hasta el foco de su color, sin cruzar cables; al unirlos, los focos se encienden.
  - Cada nivel tiene solución: se arma con cables trazados al azar.
  - Al resolverlo da +6 s. Los tableros van de 5×5 con 3 pares a 7×6 con 6.
- **Reponer el almacén (etapas 2 a 9):** tres en línea con productos (sándwich, sopa, café, manzana, jabón y toalla), cada uno sobre un círculo de su color.
  - Se juega deslizando, o tocando un producto y después su vecino.
  - Línea de 4: vacía la fila o la columna. Línea de 5: vacía todo ese producto.
  - Las cascadas multiplican los puntos. Si no quedan jugadas, el tablero se reordena.
  - Desde la etapa 5 hay 6 productos en vez de 5, lo que lo hace más difícil.
- Todas usan el marco común: pausa, combo y ritmo por etapa.

## R027 — 2026-11-26 · Volver a empezar después de terminar el juego
El autor terminó las 10 etapas y no podía volver a empezar: «Borrar partida» conservaba la etapa y el fondo, porque son del barrio.
- **Sin servidor** (el barrio simulado es solo de ese teléfono): «Borrar partida» vuelve todo a cero, incluidas la etapa y el fondo, y Rupert vuelve al callejón.
- **Con servidor:** sigue igual; la etapa y el fondo son del barrio.
- **Título:** cuando Rupert cumplió todas las metas y no hay servidor, aparece el botón «Empezar de nuevo», que pide la misma confirmación.
- **Modo pruebas sin servidor:** en Ajustes, «Ir a una etapa» salta a cualquier etapa de 0 a 9 con el fondo en cero.

## R028 — 2026-11-26 · Efectos y animaciones en las changas
- **Base común** `src/ui/efectos.ts`. Las texturas de partículas se dibujan al vuelo, sin arte nuevo.
  - Estallidos, ondas, brillos dorados, polvo, chispas, salpicaduras, confeti, humo y monedas que vuelan.
  - El rebote de escala.
- **Marco común:**
  - La changa entra con un fundido.
  - El marcador cuenta hasta el valor nuevo, late y se pone verde o rojo.
  - El reloj se pone rojo y late en los últimos 5 segundos.
  - Los avisos entran con rebote. Los puntos flotantes saltan, suben suave y se desvanecen.
  - Cada acierto suelta estrellitas y cada error, polvo.
  - Subir de nivel el combo tira confeti.
  - El cartel final entra con rebote sobre un fondo que se oscurece; si se ganó algo, hay confeti y monedas que vuelan.
- **Plomería:**
  - Los caños aparecen en cascada y giran con rebote.
  - El agua llena los caños como una ola desde la canilla, con burbujas que corren en el sentido del flujo.
  - Gotea por las pérdidas (extremos abiertos); la canilla gotea si no hay caño que reciba el agua.
  - Al resolver, una onda recorre el camino, el desagüe salpica a chorros y hay destello azul y confeti.
- **Electricidad:**
  - Cables con funda oscura y brillo.
  - Pulsos de luz que viajan del enchufe al foco, y la punta del cable que se arrastra chisporrotea.
  - Al conectar, el foco echa chispas, parpadea y queda latiendo.
  - Al completar el tablero saltan arcos eléctricos entre los focos.
- **Almacén:**
  - Cada producto que se va estalla en su color, y las líneas de 4 o 5 hacen una onda grande.
  - Lo que cae rebota al llegar; la selección late; una jugada inválida se sacude.
- **Resto:**
  - Collares y cocina: confeti al vender o servir. La comida pasada echa humo.
  - Taller: chispas al montar cada pieza; al terminar el auto, confeti y humo del escape.
  - Arreglos: onda verde y brillos al arreglar.
  - Bici: estrellitas al chocar.
  - Reciclaje: confeti en las rachas.
  - Ratones: confeti al ganar.
- **Rendimiento:** en el navegador de pruebas, sin aceleración gráfica, las 15 changas corren a 55-60 cuadros por segundo.

## R029 — 2026-11-27 · Bañarse en la ducha pública
Lo pidió el autor: para asearse con jabón o shampoo hay que ir a la ducha.
- **Dónde hay ducha:** en todos los escenarios de la calle.
  - Callejón de las etapas 1 y 2: la que ya está pintada en el fondo.
  - Callejón de la etapa 0: al fondo, junto a la tubería, más chica por la distancia.
  - Plaza: entre la fuente y el kiosco.
  - Ciudad: en la vereda, adelante a la izquierda.
  - La cabina se recortó del fondo pintado (`scripts/arte/ducha_y_shampoo.py`).
- **Cómo se usa:** se toca la ducha («Usar») o el botón «Asearse»; Rupert camina hasta ella y se elige jabón, shampoo o toalla.
- **La secuencia:**
  1. Rupert entra de espaldas y se achica hasta caber en la abertura.
  2. Una puerta corrediza con vidrio esmerilado (dibujada por el juego) se cierra.
  3. Durante 2,2 s sale vapor por arriba, hay burbujas en el vidrio, la puerta tiembla y aparece «♪ La la la ♪».
  4. Se abre la puerta y Rupert sale de frente, con brillos y una frase según lo que usó.
- **Fuera de la calle** (pieza, instituto, taller, casa), «Asearse» funciona como antes, en el lugar.
- **Shampoo:** artículo nuevo de aseo. Cuesta 35 monedas y da higiene +50 y ánimo +5. El ícono está dibujado en pixel art por el script.
