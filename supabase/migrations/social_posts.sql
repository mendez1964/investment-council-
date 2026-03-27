-- Social posts table for auto-promotion engine
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('twitter', 'linkedin', 'medium', 'reddit')),
  theme text not null,
  content_type text not null,
  source_data jsonb,
  marketing_summary text,
  post_text text not null,
  hashtags text[],
  keywords text[],
  status text not null default 'pending' check (status in ('pending', 'approved', 'scheduled', 'posted', 'failed')),
  scheduled_at timestamptz,
  posted_at timestamptz,
  twitter_post_id text,
  linkedin_post_id text,
  medium_post_url text,
  reddit_post_url text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists social_posts_status_idx on social_posts (status);
create index if not exists social_posts_scheduled_at_idx on social_posts (scheduled_at);
create index if not exists social_posts_created_at_idx on social_posts (created_at desc);
create index if not exists social_posts_platform_idx on social_posts (platform);
