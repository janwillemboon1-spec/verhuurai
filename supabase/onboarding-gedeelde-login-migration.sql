-- supabase/onboarding-gedeelde-login-migration.sql
-- Stap 1: nieuwe tabel voor de login (los van de woning)
CREATE TABLE IF NOT EXISTS onboarding_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voornaam TEXT,
  achternaam TEXT,
  email TEXT UNIQUE NOT NULL,
  wachtwoord_hash TEXT NOT NULL,
  link_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
);

-- Stap 2: koppeling toevoegen aan de woning-tabel (nog nullable — bestaande rijen/code blijven werken)
ALTER TABLE onboarding_klanten ADD COLUMN IF NOT EXISTS login_id UUID REFERENCES onboarding_logins(id);

-- Stap 3: backfill — groepeer bestaande klanten-rijen op e-mailadres,
-- de oudst aangemaakte rij per groep wordt de login van die klant
INSERT INTO onboarding_logins (voornaam, achternaam, email, wachtwoord_hash, link_token, aangemaakt_op)
SELECT DISTINCT ON (lower(email))
  voornaam, achternaam, lower(email), wachtwoord_hash, link_token, aangemaakt_op
FROM onboarding_klanten
WHERE login_id IS NULL
ORDER BY lower(email), aangemaakt_op ASC;

UPDATE onboarding_klanten k
SET login_id = l.id
FROM onboarding_logins l
WHERE lower(k.email) = l.email
  AND k.login_id IS NULL;
