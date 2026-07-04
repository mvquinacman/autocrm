import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  SOURCE_LABELS,
  type Lead,
  type LeadSource,
  type PipelineStage,
} from "@/lib/types";
import type { FollowUp } from "@/features/followups/api";
import type { AgentOption } from "@/features/leads/api";
import { manilaDateString, todayDateString } from "@/lib/format";

// ---------------------------------------------------------------------------
// Month options
// ---------------------------------------------------------------------------

export interface MonthOption {
  key: string; // '2026-07'
  label: string; // 'July 2026'
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthLabelFromKey(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

/** Recent months (newest first) on the Manila calendar. */
export function recentMonthOptions(count: number): MonthOption[] {
  const today = todayDateString(); // 'YYYY-MM-DD' in Asia/Manila
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7)); // 1-based

  const options: MonthOption[] = [];
  for (let i = 0; i < count; i++) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    options.push({ key, label: monthLabelFromKey(key) });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return options;
}

// ---------------------------------------------------------------------------
// Report model
// ---------------------------------------------------------------------------

export interface ReportAgentRow {
  agentId: string;
  agentName: string;
  leadsCreated: number;
  showroomPlus: number;
  testDrivePlus: number;
  applicationPlus: number;
  sold: number;
  target: number;
  achievementPct: number; // 0 when target is 0
  followUpsDone: number;
  followUpsMissed: number;
}

export interface MonthlyReport {
  monthKey: string;
  monthLabel: string;
  scopeLabel: string;
  generatedAt: string; // human-readable, Manila
  summary: {
    leadsCreated: number;
    sold: number;
    target: number;
    achievementPct: number | null; // null when target is 0
    conversionPct: number | null; // sold / leadsCreated, null when 0 created
    weightedPipeline: number; // current snapshot, non-released
    followUpsDone: number;
    followUpsMissed: number;
  };
  agentRows: ReportAgentRow[];
  funnel: { stage: PipelineStage; label: string; count: number }[];
  sources: {
    source: LeadSource;
    label: string;
    created: number;
    sold: number;
    conversionPct: number | null;
  }[];
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

const STAGE_INDEX = Object.fromEntries(
  PIPELINE_STAGES.map((stage, i) => [stage, i]),
) as Record<PipelineStage, number>;

function createdInMonth(lead: Lead, monthKey: string): boolean {
  return manilaDateString(lead.createdAt).startsWith(monthKey);
}

/**
 * "Sold this month" = currently released with updated_at in the month.
 * Releasing a lead bumps updated_at, so this matches the dashboards; it is a
 * documented approximation (a post-release edit would shift the month).
 */
function soldInMonth(lead: Lead, monthKey: string): boolean {
  return (
    lead.stage === "released" &&
    manilaDateString(lead.updatedAt).startsWith(monthKey)
  );
}

export function buildMonthlyReport(args: {
  leads: Lead[];
  followUps: FollowUp[];
  agents: AgentOption[];
  scopeLabel: string;
  teamTarget: number;
  monthKey: string;
}): MonthlyReport {
  const { leads, followUps, agents, scopeLabel, teamTarget, monthKey } = args;

  const doneInMonth = (f: FollowUp) =>
    f.status === "done" &&
    f.completedAt !== null &&
    manilaDateString(f.completedAt).startsWith(monthKey);
  const missedInMonth = (f: FollowUp) =>
    f.status === "missed" && f.dueDate.startsWith(monthKey);

  // Per-agent rows (every agent gets a row, even all-zero).
  const agentRows: ReportAgentRow[] = agents.map((agent) => {
    const agentLeads = leads.filter((l) => l.agentId === agent.id);
    const agentFollowUps = followUps.filter((f) => f.agentId === agent.id);
    const sold = agentLeads.filter((l) => soldInMonth(l, monthKey)).length;
    const target = agent.targetUnits ?? 0;
    return {
      agentId: agent.id,
      agentName: agent.fullName,
      leadsCreated: agentLeads.filter((l) => createdInMonth(l, monthKey))
        .length,
      showroomPlus: agentLeads.filter((l) => STAGE_INDEX[l.stage] >= 2).length,
      testDrivePlus: agentLeads.filter((l) => STAGE_INDEX[l.stage] >= 3).length,
      applicationPlus: agentLeads.filter((l) => STAGE_INDEX[l.stage] >= 4)
        .length,
      sold,
      target,
      achievementPct: target > 0 ? Math.round((sold / target) * 100) : 0,
      followUpsDone: agentFollowUps.filter(doneInMonth).length,
      followUpsMissed: agentFollowUps.filter(missedInMonth).length,
    };
  });
  agentRows.sort(
    (a, b) => b.achievementPct - a.achievementPct || b.sold - a.sold,
  );

  // Summary
  const leadsCreated = leads.filter((l) => createdInMonth(l, monthKey)).length;
  const sold = leads.filter((l) => soldInMonth(l, monthKey)).length;
  const weightedPipeline = leads
    .filter((l) => l.stage !== "released")
    .reduce((sum, l) => sum + ((l.estValue ?? 0) * l.probability) / 100, 0);

  // Funnel — current snapshot across all 7 stages.
  const funnel = PIPELINE_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: leads.filter((l) => l.stage === stage).length,
  }));

  // Sources — bucketed by the month's created leads; sold uses the same
  // released+updatedAt-in-month rule as the summary.
  const sources = (Object.keys(SOURCE_LABELS) as LeadSource[])
    .map((source) => {
      const sourceLeads = leads.filter((l) => l.source === source);
      const created = sourceLeads.filter((l) =>
        createdInMonth(l, monthKey),
      ).length;
      const sourceSold = sourceLeads.filter((l) =>
        soldInMonth(l, monthKey),
      ).length;
      return {
        source,
        label: SOURCE_LABELS[source],
        created,
        sold: sourceSold,
        conversionPct:
          created > 0 ? Math.round((sourceSold / created) * 100) : null,
      };
    })
    .filter((row) => row.created > 0)
    .sort((a, b) => b.created - a.created);

  return {
    monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    scopeLabel,
    generatedAt: new Date().toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      dateStyle: "medium",
      timeStyle: "short",
    }),
    summary: {
      leadsCreated,
      sold,
      target: teamTarget,
      achievementPct:
        teamTarget > 0 ? Math.round((sold / teamTarget) * 100) : null,
      conversionPct:
        leadsCreated > 0 ? Math.round((sold / leadsCreated) * 100) : null,
      weightedPipeline: Math.round(weightedPipeline),
      followUpsDone: followUps.filter(doneInMonth).length,
      followUpsMissed: followUps.filter(missedInMonth).length,
    },
    agentRows,
    funnel,
    sources,
  };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvField(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(...fields: (string | number)[]): string {
  return fields.map(csvField).join(",");
}

function pct(value: number | null): string {
  return value === null ? "" : `${value}%`;
}

export function reportToCsv(report: MonthlyReport): string {
  const lines: string[] = [];

  // Title
  lines.push(csvRow("Monthly Team Performance Report"));
  lines.push(csvRow("Scope", report.scopeLabel));
  lines.push(csvRow("Month", report.monthLabel));
  lines.push(csvRow("Generated", report.generatedAt));
  lines.push("");

  // Summary
  const s = report.summary;
  lines.push(csvRow("Metric", "Value"));
  lines.push(csvRow("Leads Created", s.leadsCreated));
  lines.push(csvRow("Units Sold", s.sold));
  lines.push(csvRow("Team Target", s.target));
  lines.push(csvRow("Achievement %", pct(s.achievementPct)));
  lines.push(csvRow("Conversion %", pct(s.conversionPct)));
  lines.push(csvRow("Weighted Pipeline (PHP)", s.weightedPipeline));
  lines.push(csvRow("Follow-ups Done", s.followUpsDone));
  lines.push(csvRow("Follow-ups Missed", s.followUpsMissed));
  lines.push("");

  // Agent table
  lines.push(
    csvRow(
      "Agent",
      "Leads Created",
      "Showroom+",
      "Test Drive+",
      "Application+",
      "Sold",
      "Target",
      "Achievement %",
      "Follow-ups Done",
      "Follow-ups Missed",
    ),
  );
  for (const row of report.agentRows) {
    lines.push(
      csvRow(
        row.agentName,
        row.leadsCreated,
        row.showroomPlus,
        row.testDrivePlus,
        row.applicationPlus,
        row.sold,
        row.target,
        `${row.achievementPct}%`,
        row.followUpsDone,
        row.followUpsMissed,
      ),
    );
  }
  lines.push("");

  // Funnel
  lines.push(csvRow("Stage", "Count"));
  for (const f of report.funnel) {
    lines.push(csvRow(f.label, f.count));
  }
  lines.push("");

  // Sources
  lines.push(csvRow("Source", "Leads Created", "Sold", "Conversion %"));
  for (const src of report.sources) {
    lines.push(csvRow(src.label, src.created, src.sold, pct(src.conversionPct)));
  }

  return lines.join("\r\n") + "\r\n";
}
