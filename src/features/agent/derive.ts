import type { FollowUp } from "@/features/followups/api";
import { manilaDateString, todayDateString } from "@/lib/format";
import {
  PIPELINE_STAGES,
  SOLD_STAGE,
  happyPathNext,
  isActiveStage,
  isTerminalStage,
  type Lead,
  type PipelineStage,
} from "@/lib/types";

export interface AgentKpis {
  target: number | null;
  soldThisMonth: number;
  /** null when the profile has no target set. */
  achievementPct: number | null;
  weightedPipeline: number;
  followUpsDue: number;
}

export function deriveKpis(
  leads: Lead[],
  followUps: FollowUp[],
  target: number | null,
): AgentKpis {
  const today = todayDateString();
  const monthPrefix = today.slice(0, 7); // 'YYYY-MM' in Asia/Manila

  // "Sold this month" = units released whose last update (the release)
  // falls in the current Manila calendar month.
  const soldThisMonth = leads.filter(
    (l) =>
      l.stage === SOLD_STAGE &&
      manilaDateString(l.updatedAt).startsWith(monthPrefix),
  ).length;

  // Weighted pipeline counts only active (non-terminal) leads.
  const weightedPipeline = leads
    .filter((l) => isActiveStage(l.stage) && l.estValue !== null)
    .reduce((sum, l) => sum + ((l.estValue ?? 0) * l.probability) / 100, 0);

  const followUpsDue = followUps.filter(
    (f) => f.status === "pending" && f.dueDate <= today,
  ).length;

  return {
    target,
    soldThisMonth,
    achievementPct:
      target && target > 0 ? Math.round((soldThisMonth / target) * 100) : null,
    weightedPipeline,
    followUpsDue,
  };
}

export function countLeadsByStage(
  leads: Lead[],
): Record<PipelineStage, number> {
  const counts = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, 0]),
  ) as Record<PipelineStage, number>;
  for (const lead of leads) counts[lead.stage] += 1;
  return counts;
}

/** Earliest pending follow-up due date per lead. */
export function nextFollowUpByLead(
  followUps: FollowUp[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const fu of followUps) {
    if (fu.status !== "pending") continue;
    const current = map.get(fu.leadId);
    if (!current || fu.dueDate < current) map.set(fu.leadId, fu.dueDate);
  }
  return map;
}

export type UrgencyTone = "overdue" | "today" | "upcoming" | "none";

export interface Urgency {
  rank: number;
  label: string;
  tone: UrgencyTone;
}

function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function urgencyFor(dueDate: string | undefined, today: string): Urgency {
  if (!dueDate) return { rank: 3, label: "No follow-up", tone: "none" };
  const days = diffDays(today, dueDate);
  if (days < 0)
    return { rank: 0, label: `Overdue ${-days}d`, tone: "overdue" };
  if (days === 0) return { rank: 1, label: "Today", tone: "today" };
  return {
    rank: 2,
    label: days === 1 ? "In 1 day" : `In ${days} days`,
    tone: "upcoming",
  };
}

/** Happy-path next stage for the one-tap advance (null at a terminal). */
export function nextStage(stage: PipelineStage): PipelineStage | null {
  return happyPathNext(stage);
}

/** Urgency-first sort: overdue → today → upcoming → no follow-up → closed. */
export function sortByUrgency(
  leads: Lead[],
  nextByLead: Map<string, string>,
  today: string,
): Lead[] {
  return [...leads].sort((a, b) => {
    const rankOf = (l: Lead) =>
      isTerminalStage(l.stage) ? 4 : urgencyFor(nextByLead.get(l.id), today).rank;
    const rankDiff = rankOf(a) - rankOf(b);
    if (rankDiff !== 0) return rankDiff;
    const dueA = nextByLead.get(a.id) ?? "9999-12-31";
    const dueB = nextByLead.get(b.id) ?? "9999-12-31";
    if (dueA !== dueB) return dueA < dueB ? -1 : 1;
    return a.customerName.localeCompare(b.customerName);
  });
}
