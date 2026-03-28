-- Convert trading_plans to versioned history (one row per save, not one per user)
-- Run this in the Supabase SQL editor AFTER trading_plans.sql

-- Drop the unique constraint so multiple versions can exist per user
ALTER TABLE trading_plans DROP CONSTRAINT IF EXISTS trading_plans_user_id_key;

-- Add a display name column so users can label their versions
ALTER TABLE trading_plans ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT '';

-- Index for fast per-user history queries
CREATE INDEX IF NOT EXISTS trading_plans_user_id_created_at_idx
  ON trading_plans(user_id, created_at DESC);
