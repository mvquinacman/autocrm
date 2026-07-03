/**
 * RLS verification script.
 *
 * Signs in as seeded users at each role level and checks that row-level
 * security scopes the `leads` table correctly:
 *   - agent sees fewer leads than gsm, gsm fewer than principal
 *   - an agent cannot read another agent's lead (silently filtered, not an error)
 *
 * Run with: npm run verify:rls
 * Requires the local Supabase stack to be running (npx supabase start).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config: env vars first, then .env.local, then local-dev fallbacks.
// ---------------------------------------------------------------------------

const FALLBACK_URL = "http://127.0.0.1:54321";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

/** Minimal .env parser (no dependencies). Returns {} if the file is missing. */
function readEnvFile(path: string): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const dotenv = readEnvFile(resolve(process.cwd(), ".env.local"));

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? dotenv.VITE_SUPABASE_URL ?? FALLBACK_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ?? dotenv.VITE_SUPABASE_ANON_KEY ?? FALLBACK_ANON_KEY;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// Local seed uses demo1234; against a hosted project pass the password
// printed by scripts/seed-remote.ts via VERIFY_RLS_PASSWORD.
const PASSWORD =
  process.env.VERIFY_RLS_PASSWORD ?? dotenv.VERIFY_RLS_PASSWORD ?? "demo1234";

/** A lead seeded to agent2 — agent1 must NOT be able to see it. */
const FOREIGN_LEAD_ID = "f0000000-0000-0000-0000-000000000009";

interface Account {
  role: string;
  email: string;
}

const ACCOUNTS: readonly Account[] = [
  { role: "agent", email: "agent1@demo.ph" },
  { role: "gsm", email: "gsm1@demo.ph" },
  { role: "principal", email: "principal@demo.ph" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(message: string, detail?: unknown): never {
  console.error(`ERROR: ${message}`);
  if (detail !== undefined) console.error(detail);
  process.exit(1);
}

function newClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Sign in as `account`, count visible leads, sign out. Fails loudly on error. */
async function countVisibleLeads(account: Account): Promise<number> {
  const client = newClient();

  const { error: signInError } = await client.auth.signInWithPassword({
    email: account.email,
    password: PASSWORD,
  });
  if (signInError) {
    fail(`sign-in failed for ${account.email}: ${signInError.message}`);
  }

  const { count, error: queryError } = await client
    .from("leads")
    .select("*", { count: "exact", head: true });
  if (queryError) {
    fail(`leads count query failed for ${account.email}: ${queryError.message}`);
  }
  if (count === null) {
    fail(`leads count query returned null count for ${account.email}`);
  }

  await client.auth.signOut();
  return count;
}

/** As agent1, try to read a lead belonging to agent2. Returns rows visible. */
async function fetchForeignLeadAsAgent1(): Promise<number> {
  const client = newClient();

  const { error: signInError } = await client.auth.signInWithPassword({
    email: "agent1@demo.ph",
    password: PASSWORD,
  });
  if (signInError) {
    fail(`sign-in failed for agent1@demo.ph: ${signInError.message}`);
  }

  const { data, error: queryError } = await client
    .from("leads")
    .select("*")
    .eq("id", FOREIGN_LEAD_ID);
  if (queryError) {
    fail(`foreign-lead query failed for agent1@demo.ph: ${queryError.message}`);
  }

  await client.auth.signOut();
  return data?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Verifying RLS against ${SUPABASE_URL}\n`);

  const counts = new Map<string, number>();
  for (const account of ACCOUNTS) {
    counts.set(account.role, await countVisibleLeads(account));
  }

  // Readable table: role -> email -> visible lead count
  console.log("Visible leads per role");
  console.log("----------------------------------------------------");
  console.log(
    `${"ROLE".padEnd(12)}${"EMAIL".padEnd(28)}${"LEAD COUNT".padStart(10)}`,
  );
  console.log("----------------------------------------------------");
  for (const account of ACCOUNTS) {
    const count = counts.get(account.role) ?? 0;
    console.log(
      `${account.role.padEnd(12)}${account.email.padEnd(28)}${String(count).padStart(10)}`,
    );
  }
  console.log("----------------------------------------------------\n");

  const agentCount = counts.get("agent") ?? 0;
  const gsmCount = counts.get("gsm") ?? 0;
  const principalCount = counts.get("principal") ?? 0;

  let allPassed = true;

  const assertions: readonly { label: string; passed: boolean }[] = [
    {
      label: `agent (${agentCount}) < gsm (${gsmCount})`,
      passed: agentCount < gsmCount,
    },
    {
      label: `gsm (${gsmCount}) < principal (${principalCount})`,
      passed: gsmCount < principalCount,
    },
  ];

  console.log("Scope assertions");
  for (const assertion of assertions) {
    console.log(`  [${assertion.passed ? "PASS" : "FAIL"}] ${assertion.label}`);
    if (!assertion.passed) allPassed = false;
  }

  // Negative test: RLS silently filters foreign rows (0 rows, not an error).
  const foreignRows = await fetchForeignLeadAsAgent1();
  const negativePassed = foreignRows === 0;
  console.log("\nNegative test (agent1 reading agent2's lead)");
  console.log(
    `  [${negativePassed ? "PASS" : "FAIL"}] lead ${FOREIGN_LEAD_ID} returned ${foreignRows} row(s), expected 0`,
  );
  if (!negativePassed) allPassed = false;

  console.log(
    `\n${allPassed ? "All RLS checks passed." : "One or more RLS checks FAILED."}`,
  );
  process.exit(allPassed ? 0 : 1);
}

main().catch((err: unknown) => {
  fail("unexpected error while verifying RLS", err);
});
