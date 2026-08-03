-- =========================================================
-- Nieuwe woning: Boot - Leeuwarden — commissie config
-- Voer uit in Supabase SQL editor
-- =========================================================

INSERT INTO cockpit_commissie_config
  (listing_id, listing_naam, pms, model, tarief, tarief_1_2, tarief_3, tarief_4plus, groeit_mee, actief, sort_order)
VALUES
('1739769456557363564', 'Boot - Leeuwarden', 'airbnb', 'vast_maand', 100, NULL, NULL, NULL, FALSE, TRUE, 29)
ON CONFLICT (listing_id) DO NOTHING;
