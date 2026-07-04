# AutoPipeline CRM

Sales pipeline and promo automation for automotive dealerships in the
Philippines. Multi-tenant, role-based, mobile-first for agents.

**Live demo:** https://autocrm-tawny.vercel.app

## Stack

- **Backend:** Supabase (Postgres, Auth, Row-Level Security, Realtime,
  pg_cron, Edge Functions)
- **Frontend:** React 19 + Vite, TypeScript, Tailwind v4, TanStack Query
- Data access is the Supabase JS client only — no custom API server.

## Roles

`agent`, `gsm`, `sales_director`, `dealer_principal`, `admin`. Every user
has a `dealer_id` (the tenant wall); agents and GSMs also have a `team_id`.
Scoping is enforced entirely by RLS policies — an agent sees only their own
leads, a GSM their team, directors/principals the whole dealership. The
frontend never filters for security.

## Pipeline

Seven stages, in order: `new → contacted → showroom → test_drive →
application → approved → released`.

## Local development

Requires Docker (for the local Supabase stack) and Node.

```bash
npm install
npx supabase start      # boots local Postgres/Auth/etc. in Docker
npm run db:reset        # applies migrations + seed
npm run dev             # Vite dev server (--host for LAN/phone testing)
```

Seed users share the password `demo1234` — `principal@`, `director@`,
`gsm1-2@`, `agent1-4@demo.ph`. Supabase Studio runs at
`http://127.0.0.1:54323`.

### Useful scripts

- `npm run verify:rls` — proves the RLS scoping ladder (agent < gsm <
  principal, plus a cross-agent negative test) against the running stack.
- `npm run seed:remote` — seeds a hosted project via the Auth admin API
  (reads `.env.remote`, gitignored).

## Deployment

Frontend auto-deploys to Vercel on push to `main`. Backend is a hosted
Supabase project; schema changes ship via `npx supabase db push`. See
[CLAUDE.md](CLAUDE.md) for the full deployment reference, environment
variables, and current milestone status.

## Project layout

```
src/
  features/       # agent, manager, dealer, auth, leads, followups, promos, settings
  components/     # AppShell, shared UI primitives
  lib/            # supabase client, types, formatting, helpers
  pages/          # shared route pages (lead detail, etc.)
supabase/
  migrations/     # one concern per file, replayed by db reset / db push
  seed.sql        # local demo data
scripts/          # verify-rls, seed-remote
```
