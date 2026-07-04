import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAgentLeads } from "@/features/agent/hooks";
import { fetchAgents } from "@/features/leads/api";
import { fetchPendingFollowUps } from "@/features/followups/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatPeso,
  formatPesoCompact,
  manilaDateString,
  todayDateString,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useTeams } from "./hooks";

/** fetchAgents doesn't include phone, so pull it separately from profiles. */
async function fetchAgentPhones(): Promise<Map<string, string | null>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, phone")
    .eq("role", "agent");
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row.phone]));
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function TeamRosterPage() {
  const { profile } = useAuth();
  const leadsQuery = useAgentLeads(); // RLS scopes to team / dealership
  const teamsQuery = useTeams();
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const phonesQuery = useQuery({
    queryKey: ["agents", "phones"],
    queryFn: fetchAgentPhones,
  });
  const followUpsQuery = useQuery({
    queryKey: ["followups", "pending"],
    queryFn: fetchPendingFollowUps,
  });

  if (!profile) return null;

  if (
    leadsQuery.isPending ||
    teamsQuery.isPending ||
    agentsQuery.isPending ||
    phonesQuery.isPending ||
    followUpsQuery.isPending
  ) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading team roster…
      </div>
    );
  }

  const queryError =
    leadsQuery.error ??
    teamsQuery.error ??
    agentsQuery.error ??
    phonesQuery.error ??
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
  const phones = phonesQuery.data ?? new Map<string, string | null>();
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

  const scopeLabel = isGsm
    ? (myTeam?.name ?? "Your team")
    : profile.dealerName;

  const overdueByAgent = new Map<string, number>();
  for (const fu of followUps) {
    if (fu.status === "pending" && fu.dueDate < today) {
      overdueByAgent.set(fu.agentId, (overdueByAgent.get(fu.agentId) ?? 0) + 1);
    }
  }

  const cards = agents.map((agent) => {
    const agentLeads = leads.filter((l) => l.agentId === agent.id);
    const active = agentLeads.filter((l) => l.stage !== "released");
    const sold = agentLeads.filter(
      (l) =>
        l.stage === "released" &&
        manilaDateString(l.updatedAt).startsWith(monthPrefix),
    ).length;
    const weighted = Math.round(
      active.reduce(
        (sum, l) => sum + ((l.estValue ?? 0) * l.probability) / 100,
        0,
      ),
    );
    const target = agent.targetUnits ?? 0;
    const pct = target > 0 ? Math.round((sold / target) * 100) : 0;
    return {
      agent,
      phone: phones.get(agent.id) ?? null,
      active: active.length,
      sold,
      weighted,
      target,
      pct,
      overdue: overdueByAgent.get(agent.id) ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {isGsm ? "My Team" : "Agents"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {scopeLabel} · {agents.length} agent{agents.length === 1 ? "" : "s"}
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No agents on this team yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.agent.id} className="py-0">
              <CardContent className="space-y-4 p-4">
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {initials(card.agent.fullName)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {card.agent.fullName}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {card.phone ?? "—"}
                    </div>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-lg font-bold tabular-nums tracking-tight">
                      {card.active}
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Active leads
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums tracking-tight">
                      {card.sold}
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Sold this mo.
                    </div>
                  </div>
                  <div>
                    <div
                      title={formatPeso(card.weighted)}
                      className="text-lg font-bold tabular-nums tracking-tight"
                    >
                      {formatPesoCompact(card.weighted)}
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Weighted ₱
                    </div>
                  </div>
                </div>

                {/* Target progress */}
                {card.target > 0 ? (
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          card.pct >= 60 ? "bg-emerald-500" : "bg-amber-500",
                        )}
                        style={{ width: `${Math.min(card.pct, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {card.sold}/{card.target} · {card.pct}%
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    no target
                  </div>
                )}

                {/* Follow-up discipline */}
                {card.overdue > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {card.overdue} overdue follow-up
                    {card.overdue === 1 ? "" : "s"}
                  </span>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    On top of follow-ups ✓
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-border pt-3">
                  <Link
                    to={`/app/manager/leads?agent=${card.agent.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View leads →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
