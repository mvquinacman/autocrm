import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgentLeads } from "@/features/agent/hooks";
import { useTeams } from "@/features/manager/hooks";
import { fetchAgents, type AgentOption } from "@/features/leads/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatPeso,
  formatPesoCompact,
  manilaDateString,
  todayDateString,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GsmOption {
  id: string;
  fullName: string;
  teamId: string | null;
}

async function fetchGsms(): Promise<GsmOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, team_id")
    .eq("role", "gsm")
    .order("full_name");

  if (error) throw error;
  return (data ?? []).map(
    (row: { id: string; full_name: string; team_id: string | null }) => ({
      id: row.id,
      fullName: row.full_name,
      teamId: row.team_id,
    }),
  );
}

interface TeamStats {
  activeLeads: number;
  soldThisMonth: number;
  weightedValue: number;
}

function buildTeamStats(leads: Lead[], teamId: string): TeamStats {
  const currentMonth = todayDateString().slice(0, 7);
  const teamLeads = leads.filter((l) => l.teamId === teamId);
  const active = teamLeads.filter((l) => l.stage !== "released");
  return {
    activeLeads: active.length,
    soldThisMonth: teamLeads.filter(
      (l) =>
        l.stage === "released" &&
        manilaDateString(l.updatedAt).startsWith(currentMonth),
    ).length,
    weightedValue: active.reduce(
      (sum, l) => sum + ((l.estValue ?? 0) * l.probability) / 100,
      0,
    ),
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TeamsPage() {
  const teamsQuery = useTeams();
  const leadsQuery = useAgentLeads(); // RLS gives the principal all dealership leads
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const gsmsQuery = useQuery({ queryKey: ["gsms"], queryFn: fetchGsms });

  const leads = leadsQuery.data;
  const statsByTeam = useMemo(() => {
    const map = new Map<string, TeamStats>();
    for (const team of teamsQuery.data ?? []) {
      map.set(team.id, buildTeamStats(leads ?? [], team.id));
    }
    return map;
  }, [teamsQuery.data, leads]);

  if (
    teamsQuery.isPending ||
    leadsQuery.isPending ||
    agentsQuery.isPending ||
    gsmsQuery.isPending
  ) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading teams…
      </div>
    );
  }

  const error =
    teamsQuery.error ?? leadsQuery.error ?? agentsQuery.error ?? gsmsQuery.error;
  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load: {error.message}
      </div>
    );
  }

  const teams = teamsQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const gsms = gsmsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          {teams.length} team{teams.length === 1 ? "" : "s"} · {agents.length}{" "}
          agent{agents.length === 1 ? "" : "s"} across the dealership
        </p>
      </div>

      {teams.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No teams configured.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => {
            const stats =
              statsByTeam.get(team.id) ?? {
                activeLeads: 0,
                soldThisMonth: 0,
                weightedValue: 0,
              };
            const gsm = gsms.find((g) => g.teamId === team.id) ?? null;
            const teamAgents = agents.filter((a) => a.teamId === team.id);
            const pct =
              team.monthlyTargetUnits > 0
                ? Math.round(
                    (stats.soldThisMonth / team.monthlyTargetUnits) * 100,
                  )
                : 0;

            const kpis = [
              { label: "Active leads", value: String(stats.activeLeads) },
              { label: "Sold this month", value: String(stats.soldThisMonth) },
              {
                label: "Weighted",
                value: formatPesoCompact(Math.round(stats.weightedValue)),
                title: formatPeso(Math.round(stats.weightedValue)),
              },
            ];

            return (
              <Card key={team.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold">{team.name}</h2>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Target {team.monthlyTargetUnits}/mo
                    </span>
                  </div>

                  <div className="space-y-0.5 text-sm">
                    {gsm ? (
                      <p>
                        <span className="text-muted-foreground">GSM:</span>{" "}
                        <span className="font-medium">{gsm.fullName}</span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No GSM assigned</p>
                    )}
                    <p className="text-muted-foreground">
                      {teamAgents.length} agent
                      {teamAgents.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {kpis.map((kpi) => (
                      <div key={kpi.label}>
                        <div
                          title={kpi.title}
                          className="truncate text-xl font-bold tracking-tight tabular-nums"
                        >
                          {kpi.value}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {kpi.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct >= 60 ? "bg-emerald-500" : "bg-amber-500",
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.soldThisMonth}/{team.monthlyTargetUnits} · {pct}%
                    </p>
                  </div>

                  {teamAgents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {teamAgents.map((agent: AgentOption) => (
                        <span
                          key={agent.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                            {initials(agent.fullName)}
                          </span>
                          {agent.fullName}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
