# Rupert: Road to Progress

Juego pixel art para Android: un "tamagotchi humano" con escenas point & click. Entre todos los jugadores se llena el fondo común de Rupert y, al alcanzar cada meta, Rupert mejora para todos.

- Motor: Phaser 4 + TypeScript + Vite (mismo stack que PIXANIMALS). Capacitor llega en la fase de publicación.
- Mundo de 480×270 dibujado al doble (960×540).
- Fase actual: **1 — prototipo local** (sin servidor; la comunidad del fondo se simula).

## Comandos

```bash
npm install
npm run dev      # servidor local
npm test         # pruebas de las reglas del juego
npm run build    # comprobación de tipos + build en dist/
```

## Estructura

- `src/core/` — reglas puras y probadas: cuidado, economía, fondo común, guardado.
- `src/escenas/` — Arranque (carga), Callejon (escena principal), Basura (minijuego).
- `src/ui/` — textos, botones y paneles.
- `public/assets/` — arte final ya recortado y escalado.
- `scripts/arte/` — scripts de Python que convierten las hojas de ChatGPT (1536×1024, fondo magenta) en el arte final.
- `docs/DECISIONES.md` — registro de decisiones.
