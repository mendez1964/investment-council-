create table if not exists portfolio_holdings (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,
  company_name text,
  asset_type text not null default 'stock' check (asset_type in ('stock', 'crypto', 'etf')),
  shares numeric not null,
  avg_cost numeric not null,
  sector text,
  notes text,
  added_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists portfolio_holdings_ticker_idx on portfolio_holdings(ticker);
create index if not exists portfolio_holdings_added_at_idx on portfolio_holdings(added_at);
