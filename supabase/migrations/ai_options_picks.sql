create table if not exists ai_options_picks (
  id bigserial primary key,
  created_at timestamptz default now(),
  pick_date date not null,
  underlying text not null,
  option_type text not null check (option_type in ('call', 'put')),
  strike numeric,
  expiry date,
  entry_premium numeric,
  stop_loss_pct integer,
  take_profit_pct integer,
  confidence integer,
  rationale text,
  catalyst text,
  sector text,
  underlying_entry_price numeric,
  exit_underlying_price numeric,
  outcome text default 'pending' check (outcome in ('pending', 'win', 'loss')),
  evaluated_at timestamptz
);

create index if not exists ai_options_picks_pick_date_idx on ai_options_picks(pick_date);
create index if not exists ai_options_picks_outcome_idx on ai_options_picks(outcome);
