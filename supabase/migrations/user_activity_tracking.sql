-- User activity tracking migration
-- Run this in the Supabase SQL editor

-- 1. Add user_id to analytics_events (nullable — anonymous events stay null)
ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);

-- 2. Add last_active_at to profiles (updated on every tracked event)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
