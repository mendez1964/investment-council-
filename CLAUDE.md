# Investment Council — Project Guide for Claude

## What This Project Is

This is the **Investment Council** project — an AI-powered investment research and analysis platform.

## CRITICAL: Project Isolation

- This is a **completely separate project** from AdZone AI
- **NEVER** touch, read, modify, or reference anything in the `adzoneai-platform` folder
- **NEVER** use the AdZone AI Supabase database, URL, or API keys
- **NEVER** deploy to the AdZone AI Railway project
- If you are ever unsure which project you are in, **stop and ask**

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database:** Supabase (investment-council project — separate from AdZone AI)
- **Deployment:** Railway (investment-council project)
- **AI:** Claude API (Anthropic)

## Environment Variables

All environment variables for this project live in:
- Local development: `/Users/dag/investment-council/.env.local`
- Production: Railway dashboard → investment-council service → Variables

The variables used in this project:
```
NEXT_PUBLIC_SUPABASE_URL=        # From THIS project's Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # From THIS project's Supabase dashboard
SUPABASE_SERVICE_ROLE_KEY=       # From THIS project's Supabase dashboard
ANTHROPIC_API_KEY=               # Claude API key
```

## Project Structure

```
investment-council/
├── CLAUDE.md                    ← You are here
├── .env.local                   ← Local environment variables (never commit)
├── package.json
├── next.config.js
├── src/
│   ├── app/                     ← Next.js App Router pages
│   ├── components/              ← React components
│   └── lib/                     ← Utilities, Supabase client, helpers
├── research/
│   ├── markets/                 ← Market research framework files
│   ├── sectors/                 ← Sector analysis files
│   └── reports/                 ← Generated reports
└── public/                      ← Static assets
```

## Purpose

The Investment Council is an AI-driven research platform that:
- Analyzes market data and investment opportunities
- Stores research and analysis in its own Supabase database
- Provides structured investment research frameworks

## Session Checklist

Before making any changes, confirm:
1. You are working in `/Users/dag/investment-council/` — NOT in `adzoneai-platform`
2. Any Supabase queries use the Investment Council project URL and keys
3. Any Railway deployments target the `investment-council` Railway project
