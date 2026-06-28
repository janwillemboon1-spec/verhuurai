-- =========================================================
-- Financiën module — Boni's Cockpit
-- Voer uit in Supabase SQL editor
-- =========================================================

-- 1. Commissie config per listing
CREATE TABLE IF NOT EXISTS cockpit_commissie_config (
  listing_id TEXT PRIMARY KEY,
  listing_naam TEXT NOT NULL,
  pms TEXT NOT NULL DEFAULT 'hostaway',
  model TEXT NOT NULL,
  -- 'pct_rent'           → commissie = tarief × rent_from_OTA
  -- 'pct_payout'         → commissie = tarief × payout_OTA
  -- 'vast_maand'         → commissie = tarief (vast bedrag per maand)
  -- 'per_nacht_verschil' → commissie = payout_OTA − (nachten × owner_tarief)
  tarief NUMERIC,
  tarief_1_2 NUMERIC,   -- owner rate bij 1-2 gasten (Travertijndijk)
  tarief_3 NUMERIC,     -- owner rate bij 3 gasten
  tarief_4plus NUMERIC, -- owner rate bij 4+ gasten
  groeit_mee BOOLEAN DEFAULT TRUE,
  actief BOOLEAN DEFAULT TRUE,
  sort_order INTEGER
);

-- 2. Gesyncte financiële reserveringsdata
CREATE TABLE IF NOT EXISTS cockpit_fin_reserveringen (
  id SERIAL PRIMARY KEY,
  hostaway_id TEXT UNIQUE,
  listing_id TEXT NOT NULL,
  listing_naam TEXT,
  kanaal TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nachten INTEGER,
  aantal_gasten INTEGER,
  rent_from_ota NUMERIC DEFAULT 0,
  payout_ota NUMERIC DEFAULT 0,
  status TEXT,
  jaar INTEGER NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_res_jaar ON cockpit_fin_reserveringen(jaar);
CREATE INDEX IF NOT EXISTS idx_fin_res_listing ON cockpit_fin_reserveringen(listing_id, jaar);

-- 3. Berekende commissies per listing per maand
CREATE TABLE IF NOT EXISTS cockpit_fin_commissies (
  listing_id TEXT NOT NULL,
  listing_naam TEXT,
  maand TEXT NOT NULL,       -- YYYY-MM
  jaar INTEGER NOT NULL,
  commissie NUMERIC NOT NULL DEFAULT 0,
  omzet_basis NUMERIC DEFAULT 0,
  model TEXT,
  berekend_op TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (listing_id, maand)
);

-- 4. Bewerkbare kostenposten
CREATE TABLE IF NOT EXISTS cockpit_fin_kosten (
  id SERIAL PRIMARY KEY,
  naam TEXT NOT NULL,
  categorie TEXT NOT NULL,
  bedrag NUMERIC NOT NULL,
  frequentie TEXT NOT NULL,
  -- 'maandelijks' | 'jaarlijks' | 'kwartaal' | 'eenmalig'
  betaalmaand INTEGER,  -- 1-12 voor jaarlijks/eenmalig
  van_maand INTEGER,    -- 1-12 beginmaand
  tot_maand INTEGER,    -- 1-12 eindmaand
  jaar INTEGER NOT NULL DEFAULT 2026,
  actief BOOLEAN DEFAULT TRUE,
  sort_order INTEGER
);

-- 5. Overige inkomstenbronnen
CREATE TABLE IF NOT EXISTS cockpit_fin_overig (
  id SERIAL PRIMARY KEY,
  naam TEXT NOT NULL,
  jaar INTEGER NOT NULL DEFAULT 2026,
  jan NUMERIC DEFAULT 0, feb NUMERIC DEFAULT 0, mrt NUMERIC DEFAULT 0,
  apr NUMERIC DEFAULT 0, mei NUMERIC DEFAULT 0, jun NUMERIC DEFAULT 0,
  jul NUMERIC DEFAULT 0, aug NUMERIC DEFAULT 0, sep NUMERIC DEFAULT 0,
  okt NUMERIC DEFAULT 0, nov NUMERIC DEFAULT 0, dec NUMERIC DEFAULT 0,
  actief BOOLEAN DEFAULT TRUE
);

-- =========================================================
-- Pre-populeer commissie config (alle actieve listings)
-- =========================================================
INSERT INTO cockpit_commissie_config VALUES
('240540',                   'Travertijndijk 37 - Roosendaal',     'hostaway', 'per_nacht_verschil', NULL,   55,    65,    75,    TRUE,  TRUE, 1),
('240544',                   'Amsteldijk Zuid 183',                'hostaway', 'pct_rent',           0.05,   NULL,  NULL,  NULL,  TRUE,  TRUE, 2),
('240575',                   'BM - Blue Mind',                     'hostaway', 'pct_rent',           0.05,   NULL,  NULL,  NULL,  TRUE,  TRUE, 3),
('240576',                   'ATL - Atlanta house boat Vinkeveen', 'hostaway', 'pct_rent',           0.05,   NULL,  NULL,  NULL,  TRUE,  TRUE, 4),
('254964',                   'Akoleienstraat 10 - AMS',            'hostaway', 'vast_maand',         350,    NULL,  NULL,  NULL,  FALSE, TRUE, 5),
('255113',                   'PW49 - Villa Vinkeveen',             'hostaway', 'pct_rent',           0.083,  NULL,  NULL,  NULL,  TRUE,  TRUE, 6),
('260017',                   'BB144 - Buitenborgh 144',            'hostaway', 'pct_rent',           0.05,   NULL,  NULL,  NULL,  TRUE,  TRUE, 7),
('267930',                   'Amstelkade 53 - AMS',                'hostaway', 'vast_maand',         400,    NULL,  NULL,  NULL,  FALSE, TRUE, 8),
('280788',                   'B&B Welgelegen 2. (4p)',             'hostaway', 'pct_rent',           0.10,   NULL,  NULL,  NULL,  TRUE,  TRUE, 9),
('280789',                   'B&B Welgelegen 3. (4p)',             'hostaway', 'pct_rent',           0.10,   NULL,  NULL,  NULL,  TRUE,  TRUE, 10),
('280790',                   'B&B Welgelegen 1. (6p)',             'hostaway', 'pct_rent',           0.10,   NULL,  NULL,  NULL,  TRUE,  TRUE, 11),
('296344',                   'Vakantiehuis Tjonger',               'hostaway', 'pct_rent',           0.0833, NULL,  NULL,  NULL,  TRUE,  TRUE, 12),
('304719',                   'IJM95 - IJmuiderslag 95',            'hostaway', 'pct_rent',           0.12,   NULL,  NULL,  NULL,  TRUE,  TRUE, 13),
('332738',                   'LOOS19 - Boegspriet 19',             'hostaway', 'pct_rent',           0.10,   NULL,  NULL,  NULL,  TRUE,  TRUE, 14),
('422765',                   'Villa Soto - A nature retreat',      'hostaway', 'pct_rent',           0.035,  NULL,  NULL,  NULL,  TRUE,  TRUE, 15),
('422766',                   'Greenview 18 @ BlueBay Curacao',     'hostaway', 'pct_rent',           0.035,  NULL,  NULL,  NULL,  TRUE,  TRUE, 16),
('453697',                   'Groenlandsekade 59',                 'hostaway', 'pct_rent',           0.03,   NULL,  NULL,  NULL,  TRUE,  TRUE, 17),
('546956232389613086',       'Molenkade 2 - Studio',               'airbnb',   'pct_payout',         0.035,  NULL,  NULL,  NULL,  TRUE,  TRUE, 18),
('1521024137813189296',      'Molenkade 2B',                       'airbnb',   'pct_payout',         0.035,  NULL,  NULL,  NULL,  TRUE,  TRUE, 19),
('1584289727457529809',      'Ankeveen',                           'airbnb',   'pct_rent',           0.10,   NULL,  NULL,  NULL,  FALSE, TRUE, 20)
ON CONFLICT (listing_id) DO NOTHING;

-- =========================================================
-- Pre-populeer kostenposten 2026 (uit Google Sheet)
-- =========================================================
INSERT INTO cockpit_fin_kosten (naam, categorie, bedrag, frequentie, betaalmaand, van_maand, tot_maand, jaar, actief, sort_order) VALUES
('Hostaway',                    'Software',   590,  'maandelijks', NULL, 1,  12, 2026, TRUE, 1),
('Plug & Pay',                  'Software',   69,   'maandelijks', NULL, 1,  12, 2026, TRUE, 2),
('Hostnet',                     'Software',   40,   'jaarlijks',   2,    NULL,NULL,2026,TRUE, 3),
('Siptrunking',                 'Software',   9,    'maandelijks', NULL, 1,  12, 2026, TRUE, 4),
('Wefact',                      'Software',   198,  'jaarlijks',   2,    NULL,NULL,2026,TRUE, 5),
('Google Cloud',                'Software',   49,   'maandelijks', NULL, 1,  12, 2026, TRUE, 6),
('Loom',                        'Software',   21,   'maandelijks', NULL, 1,  12, 2026, TRUE, 7),
('TouchStay',                   'Software',   961,  'jaarlijks',   2,    NULL,NULL,2026,TRUE, 8),
('Pricelabs',                   'Software',   283,  'maandelijks', NULL, 1,  12, 2026, TRUE, 9),
('Huddle',                      'Software',   69,   'maandelijks', NULL, 1,  12, 2026, TRUE, 10),
('Spotify',                     'Software',   11,   'maandelijks', NULL, 1,  12, 2026, TRUE, 11),
('Mailblue',                    'Software',   59,   'maandelijks', NULL, 5,  12, 2026, TRUE, 12),
('Apify',                       'Software',   25,   'maandelijks', NULL, 5,  12, 2026, TRUE, 13),
('Blotato',                     'Software',   25,   'maandelijks', NULL, 5,  12, 2026, TRUE, 14),
('Claude',                      'Software',   16,   'maandelijks', NULL, 5,  12, 2026, TRUE, 15),
('Modal',                       'Software',   5,    'maandelijks', NULL, 5,  12, 2026, TRUE, 16),
('Openrouter',                  'Software',   3,    'maandelijks', NULL, 5,  12, 2026, TRUE, 17),
('Hatsik (onderhoud website)',  'Software',   210,  'jaarlijks',   1,    NULL,NULL,2026,TRUE, 18),
('Odido',                       'Telefoon',   57,   'maandelijks', NULL, 1,  12, 2026, TRUE, 19),
('Betalingsverkeer',            'Bank',       31,   'maandelijks', NULL, 1,  12, 2026, TRUE, 20),
('De Productieve Ondernemer',   'Educatie',   640,  'maandelijks', NULL, 1,  7,  2026, TRUE, 21),
('Bron administraties (kwartaal)','Administratie',70,'kwartaal',   1,    NULL,NULL,2026,TRUE, 22),
('Bron administraties (eenmalig)','Administratie',350,'eenmalig',  1,    NULL,NULL,2026,TRUE, 23)
ON CONFLICT DO NOTHING;

-- =========================================================
-- Pre-populeer overige inkomsten 2026
-- =========================================================
INSERT INTO cockpit_fin_overig (naam, jaar, jan, feb, mrt, apr, mei, jun, jul, aug, sep, okt, nov, dec) VALUES
('Gastengidsen (abonnement)', 2026, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42),
('Online verkoop trainingen',  2026, 0,  0,  0,  0,  0,  90, 90, 90, 90, 90, 90, 90),
('Werk op uurbasis',           2026, 188,188,188,188,188,188,188,188,188,188,188,188)
ON CONFLICT DO NOTHING;

