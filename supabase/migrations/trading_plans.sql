-- Trading Plans — user's personal trading rulebook
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS trading_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Style
  trading_style text NOT NULL DEFAULT 'swing' CHECK (trading_style IN ('day', 'swing', 'position', 'long-term')),
  markets text[] NOT NULL DEFAULT ARRAY['stocks'],
  timeframes text[] NOT NULL DEFAULT ARRAY['1d'],
  -- Risk rules
  risk_per_trade_pct numeric(5,2) NOT NULL DEFAULT 1.0,
  max_daily_loss_pct numeric(5,2) NOT NULL DEFAULT 3.0,
  max_open_positions int NOT NULL DEFAULT 5,
  max_position_size_pct numeric(5,2) NOT NULL DEFAULT 10.0,
  -- Entry criteria
  entry_criteria text NOT NULL DEFAULT '',
  entry_triggers text[] NOT NULL DEFAULT ARRAY[]::text[],
  -- Exit rules
  profit_target_pct numeric(5,2),
  stop_loss_pct numeric(5,2),
  uses_trailing_stop boolean NOT NULL DEFAULT false,
  exit_criteria text NOT NULL DEFAULT '',
  -- Position sizing
  position_sizing_method text NOT NULL DEFAULT 'pct' CHECK (position_sizing_method IN ('fixed', 'pct', 'atr', 'kelly')),
  -- Focus
  preferred_sectors text[] NOT NULL DEFAULT ARRAY[]::text[],
  avoid_conditions text NOT NULL DEFAULT '',
  -- AI evaluation
  ai_score int,
  ai_feedback text,
  ai_scored_at timestamptz,
  -- Meta
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trading plan"
  ON trading_plans FOR ALL USING (auth.uid() = user_id);

-- Service role bypasses RLS automatically
