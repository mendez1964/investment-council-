-- Referral system tables

CREATE TABLE IF NOT EXISTS referral_codes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_codes_user_id_idx ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS referral_codes_code_idx    ON referral_codes(code);

CREATE TABLE IF NOT EXISTS referrals (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  code              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | converted | paid
  reward_type       TEXT NOT NULL DEFAULT 'free_month',
  commission_amount NUMERIC(10,2),
  converted_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx        ON referrals(code);
CREATE INDEX IF NOT EXISTS referrals_status_idx      ON referrals(status);

-- Track earned but not-yet-applied free months on the profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_credit_months INT NOT NULL DEFAULT 0;

-- RLS: users can only see their own referrals (service role bypasses this)
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_code"     ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_referrals" ON referrals      FOR SELECT USING (auth.uid() = referrer_id);
