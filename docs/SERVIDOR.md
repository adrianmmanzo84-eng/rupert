# Servidor de Rupert (fase 2, Firebase): barrios

Diseño acordado en R021. Para implementarlo falta que el autor cree el proyecto de Firebase y active el plan Blaze. Las Cloud Functions lo necesitan, y crearlo y aceptar sus condiciones solo lo puede hacer el autor.

## Idea

- Cada **barrio** tiene su propio Rupert: etapa, fondo y meta.
- Todos los barrios recorren las mismas etapas.
- Cupo de **500 vecinos** por barrio. Cuando todos los barrios están llenos, se abre uno nuevo.
- Las metas se calculan según el cupo (`PA_POR_VECINO × cupo`), así cada barrio avanza a un ritmo parecido.
- Un vecino que pasa **30 días** sin entrar libera su lugar. Si vuelve, sigue en su barrio aunque se pase del cupo: nunca se echa a nadie.
- La asignación es automática. Más adelante: «unirme al barrio de un amigo» con un código, si hay lugar.
- Un barrio que termina la etapa 9 pasa a temporadas propias.
- La prueba cerrada de 12 testers usa un **barrio de prueba** con cupo chico.

Las reglas puras están en `src/core/barrios.ts`, con sus pruebas: cupo, metas por cupo, asignación y vecino activo.

## Datos (Cloud Firestore)

```
barrios/{id}
  etapa: number
  fondo: number          // PA de la meta actual
  cupo: number           // 500 (el de prueba, menor)
  vecinos: number        // activos (últimos 30 días)
  creado: timestamp
  barrios/{id}/fragmentos/{0..9}   // contador repartido del fondo (muchos aportes a la vez)
    pa: number

jugadores/{uid}          // uid de Firebase Auth anónima
  barrio: number
  ultimaVisita: timestamp
  aportado: number
  aportadoHoy: number, dia: string
  recibos: string[]      // compras ya acreditadas
```

El juego **solo lee** `barrios/{id}`. Nunca escribe el fondo: todo lo que suma PA pasa por funciones del servidor.

## Funciones (Cloud Functions)

| Función | Qué hace |
|---|---|
| `entrar()` | Si el jugador no tiene barrio, aplica `asignarBarrio` dentro de una transacción. Actualiza `ultimaVisita` y, si estaba inactivo, lo vuelve a contar. Devuelve el barrio. |
| `aportarMonedas(pa)` | Valida el tope diario (60 PA) y suma al fondo del barrio. Las monedas siguen en el teléfono; en una versión posterior se pueden pasar al servidor. |
| `acreditarCompra(token, producto)` | Verifica la compra con la API de Google Play Developer, comprueba que el recibo no se haya usado, suma los PA del producto al barrio y responde OK. Recién entonces el juego consume la compra. |
| `cerrarMeta` (disparador) | Cuando la suma de fragmentos alcanza la meta: la etapa sube 1, el fondo pasa a 0 (el sobrante pasa a la meta siguiente) y se avisa a los vecinos (Cloud Messaging). |
| `limpiarInactivos` (diaria) | Recalcula `vecinos` con quienes entraron en los últimos 30 días. |

## Cambios en el juego al conectarlo

- `simularComunidad` y `CONFIG.vecinosSimulados` se reemplazan por la lectura del barrio en Firestore.
- Lo anotado en `paraServidor` (PA comprados sin servidor) se envía una vez y queda en cero.
- El texto «Prototipo: el resto del barrio está simulado» se quita.
