create table if not exists email_subscriptions (
  id bigserial primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email text not null unique,
  is_active boolean default true,
  unsubscribe_token text not null unique default gen_random_uuid()::text,
  morning_briefing_stocks boolean default false,
  morning_briefing_crypto boolean default false,
  eod_recap_stocks boolean default false,
  eod_recap_crypto boolean default false,
  daily_picks boolean default false,
  options_trades boolean default false,
  economic_calendar boolean default false,
  fear_greed_alerts boolean default false,
  last_morning_sent date,
  last_eod_sent date,
  last_picks_sent date,
  last_options_sent date,
  last_calendar_sent date
);

create index if not exists email_subscriptions_email_idx on email_subscriptions(email);
create index if not exists email_subscriptions_token_idx on email_subscriptions(unsubscribe_token);
