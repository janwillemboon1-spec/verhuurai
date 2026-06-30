-- ============================================================
-- Review Remover — database migratie
-- Uitvoeren in Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS review_remover_rapporten (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  aangemaakt_op     TIMESTAMPTZ DEFAULT NOW(),
  naam              TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  taal              TEXT        NOT NULL DEFAULT 'nl',
  review_tekst      TEXT        NOT NULL,
  sterren           INT         NOT NULL,
  context           TEXT,
  screenshot_urls   TEXT[],
  verdict           TEXT,
    -- laag | gemiddeld | hoog
  onderbouwing      TEXT,
  toegepaste_regels TEXT[],
  bezwaarbrief      TEXT,
  stappenplan       TEXT[],
  email_verzonden   BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_review_remover_rapporten_aangemaakt_op
  ON review_remover_rapporten(aangemaakt_op DESC);

-- RLS inschakelen zonder policies — alleen de service-role (admin client) heeft
-- toegang. Anonieme lead-tabel zonder user_id, zelfde aanpak als gratis_rapporten.
ALTER TABLE review_remover_rapporten ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HANDMATIGE STAP (niet via deze migratie automatisch uitgevoerd):
-- 1. Maak in Supabase Dashboard > Storage een nieuwe PUBLIEKE bucket aan
--    genaamd "review-remover-bewijs".
-- 2. Run daarna onderstaande policy in de SQL editor:
-- ============================================================
-- CREATE POLICY "Publiek lezen review-remover-bewijs"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'review-remover-bewijs');
