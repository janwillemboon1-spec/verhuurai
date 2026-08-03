-- =========================================================
-- Start/eindmaand voor commissie config (vast_maand-model)
-- Voer uit in Supabase SQL editor
-- =========================================================

ALTER TABLE cockpit_commissie_config ADD COLUMN IF NOT EXISTS van_maand INTEGER DEFAULT 1;
ALTER TABLE cockpit_commissie_config ADD COLUMN IF NOT EXISTS tot_maand INTEGER DEFAULT 12;

-- Boot - Leeuwarden loopt pas vanaf juli mee
UPDATE cockpit_commissie_config SET van_maand = 7 WHERE listing_id = '1739769456557363564';
