-- ============================================================
-- Foto Optimizer — database migratie
-- Uitvoeren in Supabase SQL editor
-- ============================================================

-- Hoofd-tabel: één rij per betaalde sessie
CREATE TABLE IF NOT EXISTS foto_sessies (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  naam              TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  user_id           UUID        REFERENCES auth.users(id),
  status            TEXT        NOT NULL DEFAULT 'betaald',
    -- betaald | verwerking | klaar | fout
  aantal_fotos      INT         NOT NULL DEFAULT 0,
  totaal_prijs      NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  zip_pad           TEXT,       -- Storage pad voor het zip-bestand
  aangemaakt_op     TIMESTAMPTZ DEFAULT NOW(),
  klaar_op          TIMESTAMPTZ
);

-- Detail-tabel: één rij per foto binnen een sessie
CREATE TABLE IF NOT EXISTS foto_bewerkingen (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sessie_id         UUID        NOT NULL REFERENCES foto_sessies(id) ON DELETE CASCADE,
  volgnummer        INT         NOT NULL,
  ruimte            TEXT,
    -- woonkamer | keuken | eetgedeelte | slaapkamer | badkamer | buitenruimte | exterieur | overig
  origineel_pad     TEXT,       -- Storage pad origineel
  bewerkt_pad       TEXT,       -- Storage pad bewerkt
  status            TEXT        NOT NULL DEFAULT 'wachtrij',
    -- wachtrij | verwerking | klaar | overgeslagen | fout
  overgeslagen_reden TEXT,
  analyse_json      JSONB,      -- FotoCriteria + Claude analyse resultaat
  aangemaakt_op     TIMESTAMPTZ DEFAULT NOW(),
  klaar_op          TIMESTAMPTZ
);

-- Index voor snelle lookups per sessie
CREATE INDEX IF NOT EXISTS idx_foto_bewerkingen_sessie_id
  ON foto_bewerkingen(sessie_id);

-- RLS inschakelen
ALTER TABLE foto_sessies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE foto_bewerkingen ENABLE ROW LEVEL SECURITY;

-- Gebruiker ziet alleen eigen sessies (service role bypast RLS automatisch)
CREATE POLICY "Gebruiker ziet eigen foto_sessies"
  ON foto_sessies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Gebruiker ziet eigen foto_bewerkingen"
  ON foto_bewerkingen FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM foto_sessies
      WHERE id = foto_bewerkingen.sessie_id
        AND user_id = auth.uid()
    )
  );
