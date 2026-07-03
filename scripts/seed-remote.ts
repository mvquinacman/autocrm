/**
 * Remote seeding for the HOSTED Supabase project.
 *
 * Local dev seeds auth.users with raw SQL (supabase/seed.sql), which is fine
 * for the local stack but not for hosted GoTrue — so this script creates the
 * demo users through the auth admin API (service role), then inserts the same
 * demo dataset via PostgREST, remapping the local fixed user UUIDs to the
 * real auth ids.
 *
 * Usage:
 *   1. Put in .env.remote (gitignored):
 *        SUPABASE_URL=https://<project-ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<service role key>
 *   2. npm run seed:remote
 *
 * Prints the generated demo password ONCE — save it somewhere safe.
 * Refuses to run if the dealers table already has rows.
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

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

const dotenv = readEnvFile(resolve(process.cwd(), ".env.remote"));
const SUPABASE_URL = process.env.SUPABASE_URL ?? dotenv.SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? dotenv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (env or .env.remote).",
  );
  process.exit(1);
}
if (SUPABASE_URL.includes("127.0.0.1") || SUPABASE_URL.includes("localhost")) {
  console.error("This script targets the HOSTED project; use supabase db reset locally.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Demo dataset (mirrors supabase/seed.sql; local user UUIDs are remapped)
// ---------------------------------------------------------------------------

const DEALER_ID = "d0000000-0000-0000-0000-000000000001";
const TEAM_A = "a0000000-0000-0000-0000-000000000001";
const TEAM_B = "a0000000-0000-0000-0000-000000000002";

// Local fixed ids used as keys throughout the dataset below.
const U = {
  principal: "e0000000-0000-0000-0000-000000000001",
  director: "e0000000-0000-0000-0000-000000000002",
  gsm1: "e0000000-0000-0000-0000-000000000003",
  gsm2: "e0000000-0000-0000-0000-000000000004",
  agent1: "e0000000-0000-0000-0000-000000000005",
  agent2: "e0000000-0000-0000-0000-000000000006",
  agent3: "e0000000-0000-0000-0000-000000000007",
  agent4: "e0000000-0000-0000-0000-000000000008",
} as const;

interface DemoUser {
  key: string;
  email: string;
  fullName: string;
  role: string;
  teamId: string | null;
  phone: string;
  target: number | null;
}

const USERS: DemoUser[] = [
  { key: U.principal, email: "principal@demo.ph", fullName: "Ramon Villanueva", role: "dealer_principal", teamId: null, phone: "+63 917 100 0001", target: null },
  { key: U.director, email: "director@demo.ph", fullName: "Cecilia Ramos", role: "sales_director", teamId: null, phone: "+63 917 100 0002", target: null },
  { key: U.gsm1, email: "gsm1@demo.ph", fullName: "Marites Dizon", role: "gsm", teamId: TEAM_A, phone: "+63 917 100 0003", target: null },
  { key: U.gsm2, email: "gsm2@demo.ph", fullName: "Edgardo Salazar", role: "gsm", teamId: TEAM_B, phone: "+63 917 100 0004", target: null },
  { key: U.agent1, email: "agent1@demo.ph", fullName: "Juan Miguel Santos", role: "agent", teamId: TEAM_A, phone: "+63 917 100 0005", target: 5 },
  { key: U.agent2, email: "agent2@demo.ph", fullName: "Ana Liza Reyes", role: "agent", teamId: TEAM_A, phone: "+63 917 100 0006", target: 5 },
  { key: U.agent3, email: "agent3@demo.ph", fullName: "Paolo Bautista", role: "agent", teamId: TEAM_B, phone: "+63 917 100 0007", target: 5 },
  { key: U.agent4, email: "agent4@demo.ph", fullName: "Kristine Ocampo", role: "agent", teamId: TEAM_B, phone: "+63 917 100 0008", target: 5 },
];

const leadId = (n: number) =>
  `f0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// [n, agentKey, name, phone, source, model, variant, stage, prob, estValue, createdDaysAgo, updatedDaysAgo]
type LeadRow = [number, string, string, string, string, string, string, string, number, number, number, number];

const LEADS: LeadRow[] = [
  [1, U.agent1, "Roberto dela Cruz", "+63 918 201 4501", "facebook_ads", "Vios", "1.3 XLE CVT", "new", 25, 848000, 2, 2],
  [2, U.agent1, "Marissa Aquino", "+63 919 305 8812", "website", "Raize", "1.0 Turbo CVT", "new", 20, 1063000, 1, 1],
  [3, U.agent1, "Dennis Garcia", "+63 918 442 7719", "walk_in", "Innova", "2.8 E Diesel AT", "contacted", 35, 1611000, 6, 4],
  [4, U.agent1, "Lorna Mendoza", "+63 919 118 2244", "referral", "Wigo", "1.0 G CVT", "contacted", 35, 709000, 5, 3],
  [5, U.agent1, "Arnel Villanueva", "+63 918 667 3390", "facebook_ads", "Fortuner", "2.4 G Diesel 4x2 AT", "showroom", 50, 1874000, 9, 2],
  [6, U.agent1, "Cherry Santos", "+63 919 728 5561", "website", "Veloz", "1.5 V CVT", "test_drive", 60, 1250000, 12, 1],
  [7, U.agent1, "Federico Ramos", "+63 918 903 1187", "referral", "Hilux", "Conquest 2.8 4x4 AT", "application", 75, 1861000, 18, 3],
  [8, U.agent1, "Imelda Navarro", "+63 919 214 6633", "walk_in", "Yaris Cross", "1.5 S HEV CVT", "approved", 90, 1556000, 25, 2],
  [9, U.agent2, "Gerardo Bautista", "+63 918 335 9021", "facebook_ads", "Raize", "1.2 E CVT", "new", 25, 781000, 1, 1],
  [10, U.agent2, "Rowena Castillo", "+63 919 556 7742", "other", "Vios", "1.5 GR-S CVT", "new", 30, 1039000, 3, 3],
  [11, U.agent2, "Nestor Ocampo", "+63 918 771 2856", "website", "Innova", "2.8 V Diesel AT", "contacted", 35, 1919000, 7, 5],
  [12, U.agent2, "Divina Soriano", "+63 919 883 4410", "referral", "Wigo", "1.0 TRD S CVT", "contacted", 35, 748000, 6, 4],
  [13, U.agent2, "Ferdinand Lim", "+63 918 492 6178", "walk_in", "Fortuner", "2.8 Q Diesel 4x4 AT", "showroom", 50, 2509000, 10, 2],
  [14, U.agent2, "Corazon Pascual", "+63 919 605 3327", "facebook_ads", "Veloz", "1.5 G CVT", "application", 75, 1185000, 20, 4],
  [15, U.agent2, "Danilo Fernandez", "+63 918 210 9984", "referral", "Vios", "1.3 XE CVT", "released", 100, 888000, 32, 1],
  [16, U.agent3, "Evelyn Torres", "+63 919 447 8823", "facebook_ads", "Wigo", "1.0 E MT", "new", 20, 709000, 1, 1],
  [17, U.agent3, "Rodolfo Mercado", "+63 918 559 1204", "walk_in", "Hilux", "2.4 E Diesel 4x2 MT", "new", 25, 1122000, 2, 2],
  [18, U.agent3, "Teresita Gonzales", "+63 919 662 3389", "website", "Yaris Cross", "1.5 V CVT", "new", 30, 1204000, 4, 4],
  [19, U.agent3, "Manuel Aquino", "+63 918 778 4456", "referral", "Vios", "1.3 XLE CVT", "contacted", 35, 848000, 8, 5],
  [20, U.agent3, "Josefina Ramirez", "+63 919 884 5512", "other", "Raize", "1.0 Turbo CVT", "contacted", 35, 1063000, 7, 3],
  [21, U.agent3, "Alfredo dela Cruz", "+63 918 991 6678", "facebook_ads", "Innova", "2.8 E Diesel AT", "showroom", 50, 1611000, 11, 2],
  [22, U.agent3, "Beverly Santiago", "+63 919 103 7789", "walk_in", "Veloz", "1.5 V CVT", "test_drive", 60, 1250000, 14, 1],
  [23, U.agent3, "Rogelio Mendoza", "+63 918 215 8890", "referral", "Fortuner", "2.4 V Diesel 4x2 AT", "approved", 90, 2119000, 28, 3],
  [24, U.agent4, "Luzviminda Cruz", "+63 919 327 9901", "facebook_ads", "Vios", "1.3 J MT", "new", 20, 848000, 1, 1],
  [25, U.agent4, "Wilfredo Padilla", "+63 918 438 1012", "website", "Hilux", "2.4 G Diesel 4x2 AT", "new", 30, 1436000, 3, 3],
  [26, U.agent4, "Gloria Villanueva", "+63 919 549 2123", "referral", "Wigo", "1.0 G CVT", "contacted", 35, 709000, 6, 4],
  [27, U.agent4, "Ernesto Reyes", "+63 918 650 3234", "walk_in", "Yaris Cross", "1.5 G CVT", "showroom", 50, 1341000, 9, 2],
  [28, U.agent4, "Melinda Salvador", "+63 919 761 4345", "facebook_ads", "Raize", "1.2 G CVT", "showroom", 50, 902000, 10, 3],
  [29, U.agent4, "Ricardo Domingo", "+63 918 872 5456", "other", "Innova", "2.8 V Diesel AT", "test_drive", 60, 1919000, 13, 1],
  [30, U.agent4, "Susana Garcia", "+63 919 983 6567", "website", "Fortuner", "2.8 Q Diesel 4x4 AT", "application", 75, 2509000, 19, 4],
];

// [leadNo, actorKey, type, detail, daysAgo]
type ActivityRow = [number, string, string, string, number];

const ACTIVITIES: ActivityRow[] = [
  [1, U.agent1, "messenger", "Customer asked about DP promo for Vios via FB Messenger", 1],
  [3, U.agent1, "call", "Called re: Innova availability, will visit showroom this weekend", 4],
  [5, U.agent1, "showroom_visit", "Viewed Fortuner G in Super White, comparing with V variant", 2],
  [6, U.agent1, "test_drive", "Test drove Veloz V, liked the ride. Asking for best cash discount", 1],
  [7, U.agent1, "note", "Submitted COE and 3 months payslips, bank application in process", 3],
  [11, U.agent2, "sms", "Sent quotation for Innova V, customer comparing with Innova E", 5],
  [13, U.agent2, "showroom_visit", "Walked in with family, interested in Fortuner Q top of the line", 2],
  [19, U.agent3, "call", "Follow-up call, scheduled Saturday test drive", 3],
  [22, U.agent3, "test_drive", "Test drove Veloz, wants quote with 20% DP and 5-year term", 1],
  [27, U.agent4, "messenger", "Asked kung may available na Yaris Cross in Blazing Blue", 2],
  [30, U.agent4, "note", "Bank pre-approved, waiting for final loan documents from customer", 2],
];

// [leadNo, agentKey, dueOffsetDays, status, note, completedDaysAgo|null]
type FollowUpRow = [number, string, number, string, string, number | null];

const FOLLOW_UPS: FollowUpRow[] = [
  [3, U.agent1, -2, "pending", "Call back re: showroom visit sched, di pa nakakareply", null],
  [11, U.agent2, -1, "pending", "Follow up on Innova quotation, competitor also offered", null],
  [19, U.agent3, -2, "pending", "Confirm Saturday test drive slot for Vios", null],
  [16, U.agent3, -5, "missed", "Initial call attempt, no answer twice", null],
  [1, U.agent1, 0, "pending", "Send Vios DP promo computation via Messenger", null],
  [26, U.agent4, 0, "pending", "Call to invite for weekend showroom event", null],
  [6, U.agent1, 1, "pending", "Present final Veloz discount approval from GSM", null],
  [13, U.agent2, 2, "pending", "Fortuner Q test drive, customer prefers weekday afternoon", null],
  [29, U.agent4, 3, "pending", "Follow up on Innova financing docs, kulang pa ITR", null],
  [23, U.agent3, 5, "pending", "Coordinate Fortuner unit release schedule and insurance", null],
  [15, U.agent2, -3, "done", "Post-release courtesy call, customer very happy with Vios", 2],
];

const PROMOS = [
  {
    title: "Raize Low Downpayment Promo",
    model: "Raize",
    description:
      "Drive home a Toyota Raize with only ₱49,000 all-in downpayment. Includes chattel mortgage fee, 1st year comprehensive insurance, and LTO registration.",
  },
  {
    title: "Vios 0% Interest",
    model: "Vios",
    description:
      "Own a Toyota Vios at 0% interest for up to 36 months financing. Available on select variants through participating banks.",
  },
  {
    title: "Fortuner Year-End Discount",
    model: "Fortuner",
    description:
      "Get up to ₱150,000 cash discount on the Toyota Fortuner. Applicable to cash and financed purchases while stocks last.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MANILA_TZ = "Asia/Manila";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function manilaDateOffset(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: MANILA_TZ,
  });
}

function generatePassword(): string {
  // e.g. AutoPipe-x7Kq2mVw9c! — memorable prefix, random core, symbol suffix
  const core = randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);
  return `AutoPipe-${core}!`;
}

function bail(message: string, detail?: unknown): never {
  console.error(`ERROR: ${message}`);
  if (detail !== undefined) console.error(detail);
  process.exit(1);
}

async function insertOrBail(table: string, rows: unknown[]): Promise<void> {
  const { error } = await admin.from(table).insert(rows);
  if (error) bail(`insert into ${table} failed: ${error.message}`);
  console.log(`  ✓ ${table}: ${rows.length} row(s)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Seeding hosted project at ${SUPABASE_URL}\n`);

  // Refuse to double-seed.
  const { count, error: checkError } = await admin
    .from("dealers")
    .select("*", { count: "exact", head: true });
  if (checkError) bail(`could not check dealers table: ${checkError.message}`);
  if ((count ?? 0) > 0) {
    bail(
      "dealers table is not empty — project appears seeded already. " +
        "Wipe it (or use a fresh project) before re-running.",
    );
  }

  const password = generatePassword();

  // 1. Dealer + teams (fixed ids, safe to insert first).
  console.log("Inserting dealer and teams…");
  await insertOrBail("dealers", [
    { id: DEALER_ID, name: "Metro East Toyota", brand: "Toyota", city: "Quezon City" },
  ]);
  await insertOrBail("teams", [
    { id: TEAM_A, dealer_id: DEALER_ID, name: "Team A", monthly_target_units: 40 },
    { id: TEAM_B, dealer_id: DEALER_ID, name: "Team B", monthly_target_units: 35 },
  ]);

  // 2. Users through the auth admin API (NOT raw SQL).
  console.log("Creating auth users…");
  const idMap = new Map<string, string>();
  for (const user of USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
    });
    if (error) bail(`createUser failed for ${user.email}: ${error.message}`);
    idMap.set(user.key, data.user.id);
    console.log(`  ✓ ${user.email}`);
  }
  const mapped = (localId: string): string => {
    const id = idMap.get(localId);
    if (!id) bail(`no auth id mapped for local id ${localId}`);
    return id;
  };

  // 3. Profiles.
  console.log("Inserting profiles…");
  await insertOrBail(
    "profiles",
    USERS.map((u) => ({
      id: mapped(u.key),
      full_name: u.fullName,
      role: u.role,
      dealer_id: DEALER_ID,
      team_id: u.teamId,
      phone: u.phone,
      monthly_target_units: u.target,
    })),
  );

  // 4. Leads (team_id filled by trigger from the agent's profile).
  console.log("Inserting leads…");
  await insertOrBail(
    "leads",
    LEADS.map(([n, agent, name, phone, source, model, variant, stage, prob, est, created, updated]) => ({
      id: leadId(n),
      dealer_id: DEALER_ID,
      agent_id: mapped(agent),
      customer_name: name,
      phone,
      source,
      model,
      variant,
      stage,
      probability: prob,
      est_value: est,
      created_at: daysAgoIso(created),
      updated_at: daysAgoIso(updated),
    })),
  );

  // 5. Activities.
  console.log("Inserting lead activities…");
  await insertOrBail(
    "lead_activities",
    ACTIVITIES.map(([n, actor, type, detail, days]) => ({
      lead_id: leadId(n),
      dealer_id: DEALER_ID,
      actor_id: mapped(actor),
      type,
      detail,
      created_at: daysAgoIso(days),
    })),
  );

  // 6. Follow-ups.
  console.log("Inserting follow-ups…");
  await insertOrBail(
    "follow_ups",
    FOLLOW_UPS.map(([n, agent, offset, status, note, completedDaysAgo]) => ({
      lead_id: leadId(n),
      dealer_id: DEALER_ID,
      agent_id: mapped(agent),
      due_date: manilaDateOffset(offset),
      status,
      note,
      completed_at: completedDaysAgo === null ? null : daysAgoIso(completedDaysAgo),
    })),
  );

  // 7. Promos.
  console.log("Inserting promos…");
  await insertOrBail(
    "promos",
    PROMOS.map((p) => ({
      dealer_id: DEALER_ID,
      title: p.title,
      model: p.model,
      description: p.description,
      file_url: null,
      active: true,
      starts_on: manilaDateOffset(-10),
      ends_on: manilaDateOffset(30),
    })),
  );

  console.log("\n================= DEMO CREDENTIALS (printed once) =================");
  console.log(`Password for ALL demo users: ${password}\n`);
  for (const user of USERS) {
    console.log(`  ${user.email.padEnd(26)} ${user.role}`);
  }
  console.log("====================================================================");
  console.log("\nDone. Save the password now — it is not stored anywhere.");
}

main().catch((err: unknown) => bail("unexpected error while seeding", err));
