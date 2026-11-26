-- Barrios y jugadores (R021, R022). Cada barrio tiene su propio Rupert: etapa, fondo y cupo.
CREATE TABLE IF NOT EXISTS barrios (
  id INTEGER PRIMARY KEY,
  etapa INTEGER NOT NULL DEFAULT 0,
  fondo INTEGER NOT NULL DEFAULT 0,
  cupo INTEGER NOT NULL,
  prueba INTEGER NOT NULL DEFAULT 0,
  creado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jugadores (
  id TEXT PRIMARY KEY,
  clave TEXT NOT NULL,          -- hash SHA-256 de la clave que guarda el teléfono
  barrio INTEGER NOT NULL,
  ultima INTEGER NOT NULL,      -- última visita (ms)
  aportado INTEGER NOT NULL DEFAULT 0,
  dia TEXT NOT NULL DEFAULT '',
  hoy INTEGER NOT NULL DEFAULT 0,
  creado INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS jugadores_barrio_ultima ON jugadores (barrio, ultima);
CREATE INDEX IF NOT EXISTS jugadores_ip_creado ON jugadores (ip, creado);

-- Aportes ya sumados: el mismo aporte reenviado (por un corte de red) no se suma dos veces.
CREATE TABLE IF NOT EXISTS aportes (
  id TEXT PRIMARY KEY,
  jugador TEXT NOT NULL,
  pa INTEGER NOT NULL,
  en INTEGER NOT NULL
);
