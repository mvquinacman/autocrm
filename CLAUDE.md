# AutoPipeline CRM

SaaS CRM for automotive dealerships in the Philippines. Sales pipeline +
promo automation. Multi-tenant (multiple dealerships), role-based access.

## Stack
- Backend: Supabase (Postgres, Auth, RLS, Storage, Edge Functions)
- Frontend: React (Vite) + Tailwind + shadcn/ui, TanStack Query
- Supabase JS client for all data access — no custom API server
- Local dev: supabase CLI (`supabase start`, `supabase db reset`)

## Roles (5)
agent, gsm, sales_director, dealer_principal, admin
- Every user has: role, dealer_id; agents and gsms also have team_id
- agent sees only own leads; gsm sees team; director/principal see dealership
- ALL scoping is enforced by RLS policies, never by frontend filtering

## Pipeline stages (7, in order)
new → contacted → showroom → test_drive → application → approved → released

## Conventions
- SQL migrations in supabase/migrations, one concern per migration
- snake_case in DB, camelCase in TS
- Money is integer centavos or numeric pesos — never floats
- Every table has dealer_id (tenant wall) except dealers itself
- Peso display: ₱ symbol, e.g. ₱1,215,000
- Timezone: Asia/Manila
- After schema changes: `supabase db reset` must run clean

## Local dev notes
- Supabase CLI is an npm dev dependency: run via `npx supabase ...`
- Seed users all share the password `demo1234` (see supabase/seed.sql);
  emails: principal@demo.ph, director@demo.ph, gsm1-2@demo.ph, agent1-4@demo.ph
- RLS helper functions live in the `app` schema (security definer)
- `npm run verify:rls` proves the RLS scoping ladder against the local stack

## Roadmap (agreed 2026-07, demo-driven)
North star: Rommel (market-validation contact) demoing to a real GSM in
15 minutes. Triage every feature against that demo.
Sequence: M7 mobile-first agent layout (layout only — no data logic
changes) → M8 deploy (Vercel frontend + hosted Supabase via db push,
secrets hygiene first) → full walkthrough test + fixes → GSM "Monthly
Team Performance" report (one canned export, no report builder) →
Lead Sources page (leads + conversion by source) → demo to Rommel.
Deliberately stubbed for now: analytics section, calendar deep features,
My Sales/commissions, dealer principal full suite, settings beyond
profile/password. Mobile: agent portal must be phone-first (bottom tabs,
card rows, thumb targets); GSM/dealer views just need to be tablet-OK.
Housekeeping before real data: git checkpoint + GitHub, keep-alive or
Pro on hosted Supabase, rotate demo1234, custom domain before dealer
demos.

## Deployment
- Frontend: Vercel, auto-deploys on push to main from
  github.com/mvquinacman/autocrm (SPA rewrites via vercel.json)
- Backend: hosted Supabase project `twsimulcvedtotqafczp`
  (https://twsimulcvedtotqafczp.supabase.co, region ap-southeast-2);
  local supabase CLI is NOT linked — push schema changes with
  `npx supabase db push --db-url` using the Sydney session pooler
  (aws-1-ap-southeast-2.pooler.supabase.com:5432, user
  postgres.twsimulcvedtotqafczp; password in your vault, URL-encode it)
- Env vars (never commit values): Vercel needs VITE_SUPABASE_URL +
  VITE_SUPABASE_ANON_KEY; GitHub Actions secrets SUPABASE_URL +
  SUPABASE_ANON_KEY feed .github/workflows/keepalive.yml (daily ping,
  06:00 Manila, keeps the free tier awake)
- Hosted seeding: `npm run seed:remote` (scripts/seed-remote.ts) reads
  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.remote (gitignored),
  creates the 8 demo users via the auth admin API, prints the generated
  password ONCE, refuses to run twice; hosted demo users do NOT use
  demo1234
- Hosted RLS check: set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY /
  VERIFY_RLS_PASSWORD env vars, then `npm run verify:rls`
- pg_cron escalation job runs on hosted (cron.job:
  escalate-missed-follow-ups, 17:00 UTC = 01:00 Manila)

## Current status
(keep this section updated after each milestone)
- [x] M1 schema + RLS + seed
- [x] M2 portal auth
- [x] M3 agent dashboard shell
- [x] M4 lead management
- [x] M5 follow-ups
- [x] M6 GSM dashboard
- [x] DB foundation v2 — expanded schema (dealers.brand, team/agent targets,
      lead probability + est_value, lead_activities, promos), rewritten RLS
      with dealer wall on every policy, new seed (Metro East Toyota, 8 users,
      30 leads), scripts/verify-rls.ts; frontend adapted to new columns
- [x] Auth flow + app shell v2 — landing page with 3 portals (last-portal
      shortcut), portal-aware login with role/portal mismatch handling,
      role-guarded sections /app/agent|manager|dealer, collapsible sidebar
      from role-based nav config, live due-follow-up badge (RLS-scoped)
- [x] Sales Agent dashboard — KPI strip (target / sold this month /
      achievement % / weighted pipeline / follow-ups due), clickable
      7-stage chevron rail filter, urgency-sorted lead list with one-click
      stage advance, Today's follow-ups + Promo match panels; atomic
      advance via public.advance_lead_stage() rpc (+12 probability cap 100,
      trigger-logged activity, auto follow-up +2 days unless released)
- [x] Agent lead management — "+ Add Lead" dialog (MODELS constant with
      default est_value autofill) via atomic public.create_lead() rpc
      (lead + "Lead created" note + follow-up due today), /app/agent/leads
      with name/phone search + stage/source filters + urgency/newest sort
      (shared LeadRow), lead detail activity composer (note/call/sms/
      messenger/showroom_visit/test_drive) with mixed timeline, detail
      stage moves through the advance rpc
- [x] Follow-up system — /app/agent/follow-ups with Overdue/Today/Upcoming
      tabs (Done + optional note → lead_activities, Reschedule revives
      missed → pending), /app/agent/calendar month grid (follow-ups by
      status + logged test drives, day drill-down → lead detail), live
      badge invalidation, public.escalate_missed_follow_ups() (security
      definer, service_role only) flips pending >1 day past to missed with
      an activity row, scheduled via pg_cron daily 01:00 Manila
- [x] GSM portal — /app/manager dashboard (team KPI strip, horizontal
      funnel + released count, agent performance table sorted by
      achievement with overdue flags and row-click drill-down, Needs
      attention panel), /app/manager/leads with agent filter (?agent=) and
      reassign dialog via atomic public.reassign_lead() rpc (activity
      logged, RLS blocks cross-team), Supabase Realtime on leads
      (publication migration) invalidating queries so KPIs/funnel update
      live; sales_director gets the dealership-wide variant
- [x] M7 mobile-first agent portal — bottom tab bar (Dashboard/Leads/
      Follow-ups+badge/More sheet with user card + logout), FAB add-lead
      opening a full-screen sheet, 2×2 KPI grid (target+sold merged),
      snap-scrolling chevron rail, lead rows → cards with full-width
      advance button + tap-to-detail, collapsible right-column panels,
      follow-up card rows with big buttons, calendar day bottom sheet,
      44px touch targets + 16px inputs (no iOS zoom), safe-area padding,
      loading skeletons; GSM/dealer forced to icon rail + tables scroll
      in-card on phones; dev server runs with --host for LAN testing
