-- =========================================================
-- Kosten per maand aanpasbaar
-- Voer uit in Supabase SQL editor
-- =========================================================

-- 1. Kolommen per maand toevoegen aan kostenposten
ALTER TABLE cockpit_fin_kosten
  ADD COLUMN IF NOT EXISTS jan NUMERIC,
  ADD COLUMN IF NOT EXISTS feb NUMERIC,
  ADD COLUMN IF NOT EXISTS mrt NUMERIC,
  ADD COLUMN IF NOT EXISTS apr NUMERIC,
  ADD COLUMN IF NOT EXISTS mei NUMERIC,
  ADD COLUMN IF NOT EXISTS jun NUMERIC,
  ADD COLUMN IF NOT EXISTS jul NUMERIC,
  ADD COLUMN IF NOT EXISTS aug NUMERIC,
  ADD COLUMN IF NOT EXISTS sep NUMERIC,
  ADD COLUMN IF NOT EXISTS okt NUMERIC,
  ADD COLUMN IF NOT EXISTS nov NUMERIC,
  ADD COLUMN IF NOT EXISTS dec NUMERIC;

-- 2. Backfill: bestaande 'maandelijks'-posten krijgen hun huidige
--    bedrag in elke maand binnen van_maand..tot_maand, 0 daarbuiten.
--    Posten met andere frequenties raken we niet aan (jan..dec blijft NULL).
UPDATE cockpit_fin_kosten
SET
  jan = CASE WHEN 1  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  feb = CASE WHEN 2  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  mrt = CASE WHEN 3  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  apr = CASE WHEN 4  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  mei = CASE WHEN 5  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  jun = CASE WHEN 6  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  jul = CASE WHEN 7  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  aug = CASE WHEN 8  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  sep = CASE WHEN 9  BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  okt = CASE WHEN 10 BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  nov = CASE WHEN 11 BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END,
  dec = CASE WHEN 12 BETWEEN COALESCE(van_maand,1) AND COALESCE(tot_maand,12) THEN bedrag ELSE 0 END
WHERE frequentie = 'maandelijks' AND jan IS NULL;
