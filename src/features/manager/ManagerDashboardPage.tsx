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
  STAGE_LABELS,
  type Lead,
  type PipelineStage,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLeadsRealtime, useTeams } from "./hooks";

const PRE_RELEASE_STAGES = PIPELINE_STAGES.filter((s) => s !== "released");

const STAGE_BAR: Record<PipelineStage, string> = {
  new: "bg-slate-400",
  contacted: "bg-sky-500",
  showroom: "bg-indigo-500",
  test_drive: "bg-violet-500",
  application: "bg-amber-500",
  approved: "bg-emerald-500",
  released: "bg-emerald-600",
};

function stageIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}

function soldThisMonth(leads: Lead[], monthPrefix: string): number {
  return leads.filter(
    (l) =>
      l.stage === "released" &&
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
    .filter((l) => l.stage !== "released" && l.estValue !== null)
    .reduce((sum, l) => sum + ((l.estValue ?? 0) * l.probability) / 100, 0);

  const overdueFollowUps = followUps.filter(
    (f) => f.status === "pending" && f.dueDate < today,
  );

  const stageCounts = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, 0]),
  ) as Record<PipelineStage, number>;
  for (const lead of leads) stageCounts[lead.stage] += 1;
  const maxStageCount = Math.max(
    1,
    ...PRE_RELEASE_STAGES.map((s) => stageCounts[s]),
  );

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
        showroomPlus: agentLeads.filter((l) => stageIndex(l.stage) >= 2).length,
        testDrivePlus: agentLeads.filter((l) => stageIndex(l.stage) >= 3)
          .length,
        applicationPlus: agentLeads.filter((l) => stageIndex(l.stage) >= 4)
          .length,
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* 2. Team funnel */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Team funnel</CardTitle>
                <CardDescription>Active leads per stage</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-emerald-600">
                  {stageCounts.released}
                </div>
                <div className="text-xs text-muted-foreground">Released</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {PRE_RELEASE_STAGES.map((stage) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {STAGE_LABELS[stage]}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className={cn(
                        "h-full rounded transition-[width]",
                        STAGE_BAR[stage],
                      )}
                      style={{
                        width: `${(stageCounts[stage] / maxStageCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm font-medium">
                    {stageCounts[stage]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. Agent performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent performance</CardTitle>
              <CardDescription>
                Sorted by achievement · click a row to see the agent's leads
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-2 py-3 text-center font-medium">Leads</th>
                    <th className="px-2 py-3 text-center font-medium">
                      Showroom+
                    </th>
                    <th className="px-2 py-3 text-center font-medium">
                      Test drive+
                    </th>
                    <th className="px-2 py-3 text-center font-medium">
                      Application+
                    </th>
                    <th className="px-2 py-3 text-center font-medium">Sold</th>
                    <th className="px-4 py-3 font-medium">Achievement</th>
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
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {row.agent.fullName}
                        </span>
                        {row.overdue > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {row.overdue} overdue
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">{row.leads}</td>
                      <td className="px-2 py-3 text-center text-muted-foreground">
                        {row.showroomPlus}
                      </td>
                      <td className="px-2 py-3 text-center text-muted-foreground">
                        {row.testDrivePlus}
                      </td>
                      <td className="px-2 py-3 text-center text-muted-foreground">
                        {row.applicationPlus}
                      </td>
                      <td className="px-2 py-3 text-center font-medium">
                        {row.sold}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                row.achievement >= 60
                                  ? "bg-emerald-500"
                                  : "bg-amber-500",
                              )}
                              style={{
                                width: `${Math.min(row.achievement, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {row.achievement}% of {row.target}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. Needs attention */}
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
  );
}
