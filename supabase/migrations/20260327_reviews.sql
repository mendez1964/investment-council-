CREATE TABLE IF NOT EXISTS reviews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email           TEXT,
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  picks_helpful   TEXT,   -- Yes / Somewhat / No
  ai_trustworthy  TEXT,
  easy_to_use     TEXT,
  saves_time      TEXT,
  would_use_daily TEXT,   -- Yes / Maybe / Not yet
  top_feature     TEXT,
  improve         TEXT,
  would_recommend TEXT,   -- Yes / Maybe / No
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_user_id_idx   ON reviews(user_id);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- Anyone can insert (even anonymous), only service role can read all
CREATE POLICY "anyone_can_review" ON reviews FOR INSERT WITH CHECK (true);
