-- Voeg kolom toe om foto's als publiek voorbeeld te markeren op /photo-optimizer
ALTER TABLE foto_bewerkingen
  ADD COLUMN IF NOT EXISTS toon_als_voorbeeld BOOLEAN DEFAULT FALSE;

-- Index voor snelle query op de landingspagina
CREATE INDEX IF NOT EXISTS idx_foto_bewerkingen_voorbeeld
  ON foto_bewerkingen (toon_als_voorbeeld)
  WHERE toon_als_voorbeeld = TRUE;
