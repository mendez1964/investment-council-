-- Add options briefing to email subscriptions
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS options_briefing boolean DEFAULT false;
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS last_options_briefing_sent date;
