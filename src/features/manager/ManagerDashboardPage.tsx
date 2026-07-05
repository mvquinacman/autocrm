import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAgentLeads } from "@/features/agent/hooks";
import { fetchAgents } from "@/features/leads/api";
import { fetchPendingFollowUps } from "@/features/followups/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateOnly,
  formatPeso,
  formatPesoCompact,
  manilaDateString,
  todayDateString,
} from "@/lib/format";
import {
  PIPELINE_STAGES,
  SOLD_STAGE,
  STAGE_LABELS,
  STAGE_SHORT_LABELS,
  isActiveStage,
  type Lead,
  type PipelineStage,
} from "@/lib/types";
import { STAGE_HEX } from "@/lib/stageColors";
import { PipelineHeader } from "@/components/pipeline/PipelineHeader";
import { ConversionOverview } from "@/components/ConversionOverview";
import { DonutChart } from "@/components/DonutChart";
import { cn } from "@/lib/utils";
import { useLeadsRealtime, useTeams } from "./hooks";

function emptyStageCounts(): Record<PipelineStage, number> {
  return Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<
    PipelineStage,
    number
  >;
}

function countByStage(leads: Lead[]): Record<PipelineStage, number> {
  const counts = emptyStageCounts();
  for (const lead of leads) counts[lead.stage] += 1;
  return counts;
}

function soldThisMonth(leads: Lead[], monthPrefix: string): number {
  return leads.filter(
    (l) =>
      l.stage === SOLD_STAGE &&
      manilaDateString(l.updatedAt).startsWith(monthPrefix),
  ).length;
}

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const leadsQuery = useAgentLeads(); // RLS scopes to the GSM's team
  const teamsQuery = useTeams();
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const followUpsQuery = useQuery({
    queryKey: ["followups", "pending"],
    queryFn: fetchPendingFollowUps,
  });
  useLeadsRealtime();

  if (!profile) return null;

  if (
    leadsQuery.isPending ||
    teamsQuery.isPending ||
    agentsQuery.isPending ||
    followUpsQuery.isPending
  ) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading team dashboard…
      </div>
    );
  }

  const queryError =
    leadsQuery.error ??
    teamsQuery.error ??
    agentsQuery.error ??
    followUpsQuery.error;
  if (queryError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load: {queryError.message}
      </div>
    );
  }

  const leads = leadsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const followUps = followUpsQuery.data ?? [];
  const today = todayDateString();
  const monthPrefix = today.slice(0, 7);

  const isGsm = profile.role === "gsm";
  const myTeam = isGsm
    ? (teams.find((t) => t.id === profile.teamId) ?? null)
    : null;

  // GSM: own team's agents; sales_director: all dealership agents.
  const agents = (agentsQuery.data ?? []).filter(
    (a) => !isGsm || a.teamId === profile.teamId,
  );

  const teamTarget = isGsm
    ? (myTeam?.monthlyTargetUnits ?? 0)
    : teams.reduce((sum, t) => sum + t.monthlyTargetUnits, 0);

  const teamSold = soldThisMonth(leads, monthPrefix);
  const achievementPct =
    teamTarget > 0 ? Math.round((teamSold / teamTarget) * 100) : null;

  const weightedPipeline = leads
    .filter((l) => isActiveStage(l.stage) && l.estValue !== null)
    .reduce((sum, l) => sum + ((l.estValue ?? 0) * l.probability) / 100, 0);

  const overdueFollowUps = followUps.filter(
    (f) => f.status === "pending" && f.dueDate < today,
  );

  const stageCounts = countByStage(leads);

  // Pipeline distribution donut segments + quick-summary buckets.
  const donutSegments = PIPELINE_STAGES.filter((s) => stageCounts[s] > 0).map(
    (s) => ({ label: STAGE_LABELS[s], value: stageCounts[s], color: STAGE_HEX[s] }),
  );
  const inProgress = (
    [
      "new_lead",
      "attempting_contact",
      "no_response",
      "contacted",
      "proposal_sent",
      "application_submitted",
      "cash_transaction",
      "bank_processing",
    ] as PipelineStage[]
  ).reduce((sum, s) => sum + stageCounts[s], 0);
  const positiveOutcome = stageCounts.approved + stageCounts.unit_released;
  const negativeOutcome = stageCounts.denied;

  const overdueByAgent = new Map<string, number>();
  for (const fu of overdueFollowUps) {
    overdueByAgent.set(fu.agentId, (overdueByAgent.get(fu.agentId) ?? 0) + 1);
  }

  const agentRows = agents
    .map((agent) => {
      const agentLeads = leads.filter((l) => l.agentId === agent.id);
      const sold = soldThisMonth(agentLeads, monthPrefix);
      const target = agent.targetUnits ?? 0;
      return {
        agent,
        leads: agentLeads.length,
        counts: countByStage(agentLeads),
        sold,
        target,
        achievement: target > 0 ? Math.round((sold / target) * 100) : 0,
        overdue: overdueByAgent.get(agent.id) ?? 0,
      };
    })
    .sort((a, b) => b.achievement - a.achievement || b.sold - a.sold);

  const scopeLabel = isGsm
    ? (myTeam?.name ?? "Your team")
    : profile.dealerName;

  const kpiCells = [
    { label: "Team target", value: String(teamTarget) },
    { label: "Sold this month", value: String(teamSold) },
    {
      label: "Achievement",
      value: achievementPct !== null ? `${achievementPct}%` : "—",
      className:
        achievementPct === null
          ? undefined
          : achievementPct >= 60
            ? "text-emerald-600"
            : "text-amber-600",
    },
    {
      label: "Weighted pipeline",
      value: formatPesoCompact(Math.round(weightedPipeline)),
      title: formatPeso(Math.round(weightedPipeline)),
    },
    {
      label: "Overdue follow-ups",
      value: String(overdueFollowUps.length),
      className:
        overdueFollowUps.length > 0 ? "text-destructive" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{scopeLabel} dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {leads.length} team lead{leads.length === 1 ? "" : "s"} · live
        </p>
      </div>

      {/* 1. KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {kpiCells.map((cell) => (
          <Card key={cell.label} className="py-0">
            <CardContent className="p-4">
              <div
                title={cell.title}
                className={cn(
                  "text-2xl font-bold tracking-tight tabular-nums",
                  cell.className,
                )}
              >
                {cell.value}
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {cell.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Pipeline header — Rommel's connected stage cards */}
      <PipelineHeader counts={stageCounts} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* 3. Lead progress per agent (count in each stage) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Lead progress by agent
              </CardTitle>
              <CardDescription>
                Count per stage · click a row to see the agent's leads
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="sticky left-0 bg-card px-4 py-3 font-medium">
                        Agent
                      </th>
                      <th className="px-2 py-3 text-center font-medium">
                        Total
                      </th>
                      {PIPELINE_STAGES.map((stage) => (
                        <th
                          key={stage}
                          className="whitespace-nowrap px-2 py-3 text-center font-medium"
                          title={STAGE_LABELS[stage]}
                        >
                          {STAGE_SHORT_LABELS[stage]}
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        Conv.
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agentRows.map((row) => (
                      <tr
                        key={row.agent.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          navigate(`/app/manager/leads?agent=${row.agent.id}`)
                        }
                      >
                        <td className="sticky left-0 bg-card px-4 py-3">
                          <div className="font-medium">
                            {row.agent.fullName}
                          </div>
                          {row.overdue > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              {row.overdue} overdue
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center font-semibold tabular-nums">
                          {row.leads}
                        </td>
                        {PIPELINE_STAGES.map((stage) => (
                          <td
                            key={stage}
                            className="px-2 py-3 text-center tabular-nums text-muted-foreground"
                          >
                            {row.counts[stage] || "·"}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              row.achievement >= 60
                                ? "text-emerald-600"
                                : "text-muted-foreground",
                            )}
                            title={`${row.sold} sold of ${row.target} target`}
                          >
                            {row.achievement}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
        {/* 4a. Pipeline distribution donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline Distribution</CardTitle>
            <CardDescription>All leads by current stage</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <DonutChart
              segments={donutSegments}
              centerValue={leads.length}
              centerLabel="Total Leads"
            />
            <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-1">
              {PIPELINE_STAGES.filter((s) => stageCounts[s] > 0).map((s) => (
                <li key={s} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STAGE_HEX[s] }}
                  />
                  <span className="truncate text-muted-foreground">
                    {STAGE_LABELS[s]}
                  </span>
                  <span className="ml-auto font-medium tabular-nums">
                    {stageCounts[s]}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 4b. Quick summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Leads", value: leads.length, cls: "" },
              { label: "In Progress", value: inProgress, cls: "text-primary" },
              {
                label: "Positive (8A+9)",
                value: positiveOutcome,
                cls: "text-emerald-600",
              },
              {
                label: "Negative (8B)",
                value: negativeOutcome,
                cls: "text-destructive",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3">
                <div
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    s.cls,
                  )}
                >
                  {s.value}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 4c. Needs attention */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  overdueFollowUps.length > 0
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              />
              Needs attention
            </CardTitle>
            <CardDescription>Overdue follow-ups across the team</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No overdue follow-ups. The team is on top of it. 🎉
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {overdueFollowUps.map((fu) => (
                  <li key={fu.id} className="space-y-0.5 py-2.5">
                    <button
                      type="button"
                      className="text-sm font-medium hover:underline"
                      onClick={() =>
                        navigate(`/app/manager/leads/${fu.leadId}`)
                      }
                    >
                      {fu.leadCustomerName}
                    </button>
                    <div className="truncate text-sm text-muted-foreground">
                      {fu.note ?? "Follow up"}
                    </div>
                    <div className="text-xs">
                      <span className="font-medium text-destructive">
                        Overdue · {formatDateOnly(fu.dueDate)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {fu.agentName}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* 5. Conversion overview */}
      <ConversionOverview counts={stageCounts} totalLeads={leads.length} />
    </div>
  );
}
