-- Analytics events table: captures every user action
create table if not exists analytics_events (
  id bigserial primary key,
  created_at timestamptz default now(),
  event_type text not null,
  page text,
  feature text,
  metadata jsonb,
  session_id text,
  duration_ms integer
);

create index if not exists analytics_events_created_at_idx on analytics_events(created_at desc);
create index if not exists analytics_events_event_type_idx on analytics_events(event_type);
create index if not exists analytics_events_page_idx on analytics_events(page);

-- API usage table: tracks every external API call and estimated costs
create table if not exists api_usage (
  id bigserial primary key,
  created_at timestamptz default now(),
  api_name text not null,
  endpoint text,
  tokens_input integer,
  tokens_output integer,
  cost_usd numeric(10,6),
  duration_ms integer,
  success boolean default true,
  error_message text,
  metadata jsonb
);

create index if not exists api_usage_created_at_idx on api_usage(created_at desc);
create index if not exists api_usage_api_name_idx on api_usage(api_name);
