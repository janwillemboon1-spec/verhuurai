-- Stripe paywall migratie — 2026-06-26
-- Voeg stripe_session_id toe aan abonnementen voor HP Audit webhook lookup

ALTER TABLE abonnementen ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
