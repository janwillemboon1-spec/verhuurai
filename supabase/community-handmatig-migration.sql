-- Verloopt_op kolom voor tijdelijke handmatige toegang (NULL = permanent)
ALTER TABLE community_leden ADD COLUMN IF NOT EXISTS verloopt_op TIMESTAMPTZ;
-- Bron bijhouden: 'mailblue' of 'handmatig'
ALTER TABLE community_leden ADD COLUMN IF NOT EXISTS bron TEXT DEFAULT 'mailblue';
