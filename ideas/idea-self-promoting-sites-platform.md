# Idea: Self-Promoting Sites Platform

**Status:** Future product — next project after Investment Council
**Origin:** Proof of concept being built inside Investment Council admin backend
**Date:** 2026-03-26

---

## The Big Idea

A **plug-and-play self-promotion engine** that any website owner can connect to their site. Once set up, it automatically scrapes their own content, generates social media posts using AI, and publishes them on a schedule — with zero ongoing effort from the owner.

Think: *"Set it and forget it" social media marketing for any website.*

---

## The Problem It Solves

- Small business owners and creators spend 5-10+ hours/week on social media content
- Most don't have budget for a social media manager ($3,000-$8,000/month)
- Tools like Buffer/Hootsuite require manual content creation — they just schedule
- Nobody has built a true "plug in your URL, walk away" solution

---

## How It Works

1. **Owner plugs in their website URL** (or specific page URLs)
2. System **scrapes the content** — blog posts, product pages, announcements, etc.
3. **AI generates platform-optimized posts** — Twitter/X, LinkedIn, Facebook, Instagram
4. Owner gets a **preview + approval queue** (or can set to full auto)
5. Posts are **scheduled and published** automatically on a cadence
6. System **learns from engagement** and improves future posts (reflection loop)

---

## Key Features

### Core Engine
- URL scraper → AI content analyzer → post generator
- Multi-platform output (Twitter, LinkedIn, Facebook, Instagram, TikTok)
- Approval mode OR full auto mode
- Scheduling with smart cadence (not spammy)
- Reflection loop — learns from what the owner edits/rejects

### Smart Triggers
- New blog post published → auto-generate promotional posts
- New product added → auto-generate announcement
- Scheduled cron → pull recent content and generate weekly posts
- Manual trigger — "generate posts from this URL right now"

### Admin Dashboard
- View scheduled posts queue
- Approve / edit / reject individual posts
- Connected platform status
- Performance metrics (when platform APIs allow)
- Prompt customization (tone, style, brand voice)

---

## Business Model

- **SaaS subscription** — per site or per seat
- Tiers: Starter (1 site, 2 platforms) / Pro (5 sites, all platforms) / Agency (unlimited)
- Possible white-label for agencies

---

## Tech Stack (Based on AdZone + Investment Council learnings)

| Component | Technology |
|-----------|------------|
| Framework | Next.js (App Router) |
| AI | Claude API (Anthropic) |
| Scraping | Firecrawl or simple HTML fetch |
| Workflow | Inngest (cron + event-driven) |
| Database | Supabase |
| Social Posting | Twitter API v2, LinkedIn API, Meta Graph API |
| Auth | Supabase Auth |
| Deployment | Railway or Vercel |

---

## Proof of Concept

Being validated inside **Investment Council** as an admin-only backend feature:
- Investment Council's own content (AI picks, market reports) feeds the engine
- Posts about Investment Council are auto-generated and scheduled
- If it works well there, extract it into a standalone product

See: `/docs/blueprint-social-autopromote-poc.md` for the Investment Council POC build plan.

---

## Competitive Moat

- Competitors (Buffer, Later, Sprout) require manual content input
- This is the only tool that **generates AND schedules** from your existing site content
- The reflection/learning loop creates a personalized brand voice over time
- Could expand to scrape competitor content or industry news for additional post ideas

---

## Open Questions

- Which posting APIs to prioritize first (Twitter v2 is most straightforward)
- How to handle image generation (screenshot of page vs. AI-generated image)
- Pricing sensitivity — what do small business owners actually pay for social tools?
- Multi-language support needed from day one?
