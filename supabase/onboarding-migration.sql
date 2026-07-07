-- supabase/onboarding-migration.sql

CREATE TABLE IF NOT EXISTS onboarding_klanten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  email TEXT NOT NULL,
  link_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  wachtwoord_hash TEXT NOT NULL,
  startdatum DATE DEFAULT CURRENT_DATE,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW(),
  kpi_bezetting_nulmeting NUMERIC,
  kpi_adr_nulmeting NUMERIC,
  kpi_reviewscore_nulmeting NUMERIC,
  kpi_reviews_nulmeting INT,
  extra_omzet_periode TEXT DEFAULT 'afgelopen 30 dagen'
);

CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id UUID REFERENCES onboarding_klanten(id) ON DELETE CASCADE,
  fase TEXT NOT NULL,
  naam TEXT NOT NULL,
  voltooid BOOLEAN DEFAULT FALSE,
  voltooid_op TIMESTAMPTZ,
  notitie TEXT,
  volgorde INT DEFAULT 0,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id UUID REFERENCES onboarding_klanten(id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  deadline DATE,
  gedaan BOOLEAN DEFAULT FALSE,
  gedaan_op TIMESTAMPTZ,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_activiteiten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id UUID REFERENCES onboarding_klanten(id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  categorie TEXT DEFAULT 'overig',
  datum TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_kpi_metingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id UUID REFERENCES onboarding_klanten(id) ON DELETE CASCADE,
  datum TIMESTAMPTZ DEFAULT NOW(),
  bezetting NUMERIC,
  adr NUMERIC,
  reviewscore NUMERIC,
  reviews_aantal INT,
  omzet_periode_bedrag NUMERIC,
  omzet_periode_label TEXT,
  notitie TEXT
);
