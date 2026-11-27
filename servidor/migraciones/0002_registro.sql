-- Registro del barrio (R043): cada jugador tiene un apodo inventado («Gato del Kiosco») y cada aporte guarda
-- su barrio, para poder mostrar los últimos aportes de un barrio sin recorrer toda la tabla.
ALTER TABLE jugadores ADD COLUMN apodo TEXT NOT NULL DEFAULT '';
ALTER TABLE aportes ADD COLUMN barrio INTEGER;
CREATE INDEX IF NOT EXISTS aportes_barrio_en ON aportes (barrio, en);
