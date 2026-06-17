# Run the RePrime Command Center locally (macOS)

Verified June 2026: the app boots clean on Next.js 16.2.4 / React 19. `/login`
renders, `/` redirects to `/login` via the `proxy.ts` auth middleware, and
`/api/health` reports which env vars are set.

## 1. Prerequisites
- **Node 20+** (you have v22 — good). Check: `node -v`
- npm (ships with Node)

## 2. Install & run (3 commands)
```bash
cd "reprime-command-center"
npm install
cp env.local.example .env.local   # then fill in values (see §3)
npm run dev
```
Open http://localhost:3000 — you'll land on `/login`.

Production mode instead of dev:
```bash
npm run build && npm start
```

## 3. Environment variables
Values live in **1Password / the original Vercel project** (`project-7e87w`),
documented in `KEYS.md`. Put them in `.env.local`.

**Minimum to boot the site** (without these the middleware throws on every request):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

With just those four you can log in and load the shell. Each additional feature
(WhatsApp, voice, calendar, CRM, research connectors) needs its own keys — see
`env.local.example` for the full grouped list and `KEYS.md` for where each comes
from.

## 4. Notes
- **Login is locked to `g@reprime.com`** (hardcoded `ALLOWED_EMAIL`). To test as
  yourself, either log in as that Supabase user or temporarily change the email
  in the route guards.
- **Cron jobs don't fire locally** — Vercel Cron only runs in production. Trigger
  one by hand:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sec-edgar-poll
  ```
- The headless-browser route (`/api/cron/inforuptcy-poll`) uses Playwright; set
  `CHROME_PATH` to a local Chrome if you want to run it locally (optional).
- Health check while running: `curl http://localhost:3000/api/health`
