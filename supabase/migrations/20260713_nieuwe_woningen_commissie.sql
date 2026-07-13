-- =========================================================
-- Nieuwe woningen — commissie config
-- Voer uit in Supabase SQL editor
-- =========================================================

INSERT INTO cockpit_commissie_config
  (listing_id, listing_naam, pms, model, tarief, tarief_1_2, tarief_3, tarief_4plus, groeit_mee, actief, sort_order)
VALUES
('43386450',            'Villa Vreeland',              'airbnb',   'vast_maand', 125, NULL, NULL, NULL, FALSE, TRUE, 21),
('884362312058244251',  'Rumah Rama - Bali',            'airbnb',   'vast_maand', 125, NULL, NULL, NULL, FALSE, TRUE, 22),
('830886789257661171',  'Chalet 7 - Leeuwarden',        'airbnb',   'vast_maand', 125, NULL, NULL, NULL, FALSE, TRUE, 23),
('830986797202742169',  'Chalet 9 - Leeuwarden',        'airbnb',   'vast_maand', 125, NULL, NULL, NULL, FALSE, TRUE, 24),
('242293',               'Boerderijhuis - Frankrijk',    'hostaway', 'vast_maand', 100, NULL, NULL, NULL, FALSE, TRUE, 25),
('253625',               'Gite Puy Mary - Frankrijk',    'hostaway', 'vast_maand', 100, NULL, NULL, NULL, FALSE, TRUE, 26),
('563569',               'Gite Panoramique - Frankrijk', 'hostaway', 'vast_maand', 100, NULL, NULL, NULL, FALSE, TRUE, 27),
('564288',               'Dorfstrasse 68 - Oostenrijk',  'hostaway', 'vast_maand', 100, NULL, NULL, NULL, FALSE, TRUE, 28)
ON CONFLICT (listing_id) DO NOTHING;
