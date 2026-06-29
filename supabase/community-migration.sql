-- Community leden tabel
CREATE TABLE IF NOT EXISTS community_leden (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  tag TEXT,
  gesynchroniseerd_op TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor snelle email lookup
CREATE INDEX IF NOT EXISTS community_leden_email_idx ON community_leden (email);
