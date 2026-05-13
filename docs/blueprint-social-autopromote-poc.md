# Blueprint: Investment Council — Content Distribution Engine (POC)

**Type:** Admin / Owner Backend — NOT user-facing
**Purpose:** Proof of concept for the Self-Promoting Sites Platform product idea
**Status:** Building — Phase 1 in progress
**Date:** 2026-03-26

---

## Overview

A fully automated content distribution engine that promotes Investment Council across social media, article platforms, and YouTube — using real picks performance data from Supabase. No scraping needed. The data is already there.

The angle is **proof, not pitch.** Posts show AI accuracy after the fact ("our AI called NVDA last Monday, +8.3% this week") — compliance-safe, compelling, and drives curiosity traffic back to the site.

This also feeds into **AdZone AI's** landing pages and funnels. AdZone handles conversion. Investment Council's engine handles proof-based traffic generation.

---

## Content Distribution Network

```
CONTENT SOURCES (already exist in Supabase)
  ├── ai_options_picks — picks with win/loss outcomes, IC scores, catalysts
  ├── profiles — user counts, tier breakdown
  └── blog-posts.ts — 12 fintech articles with site URLs

DISTRIBUTION ENGINE (what we build)
  ├── Phase 1: Social Posts → Twitter/X, LinkedIn
  ├── Phase 2: Article Syndication → Medium, Reddit, StockTwits
  ├── Phase 3: YouTube Daily Briefing → auto-generated video + voice
  └── Phase 4: Podcast RSS → Spotify, Apple Podcasts (same audio)

ALL CHANNELS POINT BACK TO INVESTMENT COUNCIL
```

---

## Data Sources (Real Supabase Tables)

### ai_options_picks — Core Content
```
underlying        — ticker (SPX, SPY, QQQ, AAPL, NVDA)
option_type       — call/put
strike            — strike price
expiry            — expiration date
entry_premium     — cost at entry
confidence        — 1-10 IC score
rationale         — explanation with catalyst + IC formula breakdown
catalyst          — what triggered the pick (news, technical break, etc.)
sector            — sector classification
underlying_entry_price  — price when pick was made
exit_underlying_price   — price at evaluation
outcome           — pending / win / loss
pick_date         — when pick was generated
evaluated_at      — when result was confirmed
```

### Post Generation Logic
Pull picks where `outcome != 'pending'` from last 7 days:
- Win rate: `COUNT(outcome='win') / COUNT(*)`
- Best pick: highest `(exit_underlying_price - underlying_entry_price) / underlying_entry_price`
- Sector breakdown: group wins/losses by sector
- Confidence calibration: wins by confidence tier (7-10 vs 4-6)

---

## 10 Content Themes

| # | Theme | Data Source | Angle |
|---|-------|-------------|-------|
| 1 | Weekly accuracy recap | All picks last 7 days | "7/10 picks profitable this week" |
| 2 | Biggest winner spotlight | Top performing pick | "NVDA call +180% in 2 days" |
| 3 | AI vs market comparison | Picks vs SPY move | "Our AI outperformed SPY 3:1" |
| 4 | Sector heat map | Wins by sector | "Tech dominated this week — here's why" |
| 5 | Confidence tier results | High confidence win rate | "9-10 confidence picks: 85% win rate" |
| 6 | Options flow insight | Catalyst field data | "Unusual options flow called this move" |
| 7 | Monday preview tease | New picks generated | "This week's AI picks are live" |
| 8 | Monthly accuracy report | 30-day rolling stats | "March: 68% win rate, 127 picks" |
| 9 | Feature highlight | Site features | "How to use the IC Score to filter picks" |
| 10 | Blog article promo | blog-posts.ts content | Article title + key insight + link |

---

## Architecture

```
[Trigger: cron or manual]
        ↓
[Pull picks data from Supabase]
        ↓
[Calculate performance stats]
        ↓
[Claude: Generate marketing summary]
        ↓
[Claude: Generate platform-specific posts per theme]
        ↓
[Store in social_posts table — status: pending]
        ↓
[Owner reviews in /owner social tab]
        ↓
[Approve → status: scheduled + pick date/time]
        ↓
[Cron runs every 30 min → posts due content]
        ↓
[Twitter API v2 / LinkedIn API]
        ↓
[Log result — status: posted or failed]
```

---

## Database

### social_posts table
```sql
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,           -- 'twitter' | 'linkedin'
  theme text not null,              -- one of the 10 themes above
  content_type text not null,       -- 'picks_accuracy' | 'winner_spotlight' | 'blog' | etc.
  source_data jsonb,                -- raw picks data used to generate this post
  marketing_summary text,           -- Claude's intermediate summary
  post_text text not null,          -- final post ready to publish
  hashtags text[],                  -- array of hashtags
  status text default 'pending',    -- pending | approved | scheduled | posted | failed
  scheduled_at timestamptz,
  posted_at timestamptz,
  twitter_post_id text,             -- returned by Twitter API after posting
  linkedin_post_id text,
  error_message text,
  created_at timestamptz default now()
);
```

---

## Phase 1: Social Posts (Twitter + LinkedIn)

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/social/generate` | POST | Pull picks data → Claude → generate posts |
| `/api/admin/social/posts` | GET | List posts with status filter |
| `/api/admin/social/posts/[id]` | PATCH | Update post text, status, scheduled_at |
| `/api/admin/social/posts/[id]` | DELETE | Remove a post |
| `/api/admin/social/publish/[id]` | POST | Manually trigger publish now |
| `/api/cron/social` | GET | Cron: publish all due scheduled posts |

### Owner UI (added to existing /owner page)

New "Social" tab in the owner dashboard:
- Stats bar: pending / scheduled / posted this week / failed
- "Generate Posts" button → triggers `/api/admin/social/generate`
- Post cards: platform icon, theme label, post preview, approve/edit/reject/schedule actions
- Scheduled queue view with calendar

### Twitter API v2 Integration
```
POST https://api.twitter.com/2/tweets
Auth: OAuth 1.0a (required for posting)
Env vars: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
Rate limit: 50 posts/day free tier
```

### LinkedIn API Integration
```
POST https://api.linkedin.com/v2/ugcPosts
Auth: OAuth 2.0 Bearer token
Env vars: LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN
```

---

## Phase 2: Article Syndication

| Platform | API | What Gets Posted |
|---|---|---|
| Medium | Medium API (POST /users/{id}/posts) | Blog articles from blog-posts.ts |
| Reddit | Reddit API (POST /r/{sub}/submit) | Picks accuracy posts + article links |
| StockTwits | StockTwits API | Short accuracy posts with $TICKER tags |

Env vars needed: `MEDIUM_TOKEN`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD`, `STOCKTWITS_TOKEN`

---

## Phase 3: YouTube Daily Briefing

```
Daily market report / picks summary text
        ↓
ElevenLabs API → professional voice audio (.mp3)
        ↓
ffmpeg (Railway) → audio + slide images → .mp4 video
        ↓
YouTube Data API v3 → auto-upload
  title: "AI Picks Daily Briefing — [Date]"
  description: "Today's AI picks + market analysis. Full picks at investmentcouncil.ai"
        ↓
Same .mp3 → RSS feed → Spotify + Apple Podcasts
```

Env vars: `ELEVENLABS_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

Cost: ~$22/mo ElevenLabs. Everything else free.

---

## Phase 4: Reflection / Learning Loop

After Phase 1-2 ship:
- Track which posts get edited before approval
- Claude compares original vs edited → infers brand voice rules
- Store rules in `social_post_rules` table
- Inject rules into future generation prompts
- Posts improve over time without manual tuning

---

## Environment Variables

```
# Phase 1 — Social
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_PERSON_URN=

# Phase 2 — Syndication
MEDIUM_TOKEN=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=
STOCKTWITS_TOKEN=

# Phase 3 — YouTube
ELEVENLABS_API_KEY=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
```

---

## Build Order

- [ ] Phase 1a: social_posts Supabase migration
- [ ] Phase 1b: `/api/admin/social/generate` — picks data → Claude → posts
- [ ] Phase 1c: `/api/admin/social/posts` CRUD routes
- [ ] Phase 1d: Social tab in /owner dashboard
- [ ] Phase 1e: Twitter API v2 posting
- [ ] Phase 1f: LinkedIn API posting
- [ ] Phase 1g: `/api/cron/social` publisher cron
- [ ] Phase 2: Medium + Reddit + StockTwits syndication
- [ ] Phase 3: YouTube daily briefing (ElevenLabs + ffmpeg + YouTube API)
- [ ] Phase 4: Reflection/learning loop

---

## Success Criteria

- Owner can click "Generate Posts" and get 10 themed posts in < 30 seconds
- Posts can be approved and scheduled from /owner social tab
- Twitter + LinkedIn post automatically on schedule
- System runs 1 week without manual intervention
- Once proven → extract into standalone Self-Promoting Sites Platform product
