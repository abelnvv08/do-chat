-- Agrega columna muted_until a demo_room_prefs si no existe
ALTER TABLE demo_room_prefs
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ DEFAULT NULL;
