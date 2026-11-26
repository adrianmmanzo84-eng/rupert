# Servidor de Rupert: barrios

Decisiones: barrios en R021; plataforma en R022, Cloudflare Workers + D1 en plan gratuito y sin tarjeta.

## Idea

- Cada **barrio** tiene su propio Rupert: etapa, fondo y meta. Todos recorren las mismas etapas.
- **Cupo:** 500 vecinos. Un jugador nuevo va al barrio más antiguo con lugar; si todos están llenos, se abre otro.
- **Metas:** se calculan según el cupo (`PA_POR_VECINO × cupo`), en `src/core/barrios.ts`.
- **Inactivos:** un vecino que pasa 30 días sin entrar libera su lugar. Si vuelve, sigue en su barrio.
- **Barrio de prueba (id 0, cupo 20):** ahí van la web con `?pruebas` y el APK de prueba.

## Código

- `servidor/src/index.ts`: el Worker.
  - `POST /entrar` crea o reconoce al jugador y devuelve su barrio.
  - `POST /aportar` suma PA con tope diario de 60. Ignora un aporte repetido y cierra metas con un control de concurrencia.
  - `GET /barrio/:id` devuelve el estado del barrio.
- `servidor/migraciones/`: tablas `barrios`, `jugadores` y `aportes` en D1.
- `src/red/servidor.ts`: el lado del juego.
  - Guarda la cuenta anónima (`rupert.cuenta`).
  - Sincroniza al abrir y cada minuto.
  - Reenvía los aportes pendientes.
  - Sin servidor o sin red, sigue con el barrio simulado.
- La dirección del servidor va en `VITE_SERVIDOR`, en `.env.production`.

## Cuentas anónimas

La primera vez, el servidor crea un id de jugador y una clave aleatoria. El teléfono guarda las dos y el servidor guarda solo el hash de la clave. Si se borran los datos de la app, el jugador empieza con una cuenta nueva. Vincular con Google para no perderla queda para más adelante.

Para frenar la creación masiva de cuentas, se permiten como máximo 10 cuentas nuevas por dirección IP y por día.

## Publicación

El flujo `.github/workflows/servidor.yml` publica en la cuenta de Cloudflare del autor. Necesita:
1. El secreto de GitHub `CLOUDFLARE_API_TOKEN`, que crea el autor con la plantilla «Edit Cloudflare Workers» más D1 Edit.
2. El `account_id` en `servidor/wrangler.toml`.

La primera vez crea la base D1 `rupert` y aplica las migraciones.

**Prueba local:** `cd servidor && npx wrangler d1 migrations apply rupert --local && npx wrangler dev --local`.

## Pendiente

- **Compras verificadas:** `POST /compra` verifica el token con la API de Google Play Developer antes de sumar los PA. Necesita una cuenta de servicio de Google con acceso a Play Console, que se crea cuando la app esté en Play Console. Mientras tanto, los PA comprados quedan anotados en el teléfono (`paraServidor`).
- **Avisos de meta cumplida:** con Firebase Cloud Messaging, que es gratis.
- **Unirse al barrio de un amigo** con un código.
