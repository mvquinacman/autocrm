import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLeads } from "@/features/leads/useLeads";
import { fetchAgents } from "@/features/leads/api";
import { DueFollowUps } from "@/features/followups/DueFollowUps";
import { StageSummary, countByStage } from "@/components/StageSummary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPeso } from "@/lib/format";
import {
  PIPELINE_STAGES,
  ROLE_LABELS,
  STAGE_SHORT_LABELS,
  isActiveStage,
  type Lead,
} from "@/lib/types";

export function TeamDashboardPage() {
  const { profile } = useAuth();
  const { data: leads, isPending, error } = useLeads();

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  if (!profile) return null;

  if (isPending || agentsQuery.isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading pipeline…</div>;
  }

  if (error || agentsQuery.error) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load: {(error ?? agentsQuery.error)?.message}
      </div>
    );
  }

  // GSM: own team's agents. Director/principal/admin: all dealership agents.
  const agents =
    profile.role === "gsm"
      ? agentsQuery.data.filter((a) => a.teamId === profile.teamId)
      : agentsQuery.data;

  const leadsByAgent = new Map<string, Lead[]>();
  for (const lead of leads) {
    const list = leadsByAgent.get(lead.agentId) ?? [];
    list.push(lead);
    leadsByAgent.set(lead.agentId, list);
  }

  const activePipelineValue = leads
    .filter((l) => isActiveStage(l.stage) && l.estValue !== null)
    .reduce((sum, l) => sum + (l.estValue ?? 0), 0);

  const scopeLabel =
    profile.role === "gsm" ? (profile.teamName ?? "your team") : profile.dealerName;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {profile.role === "gsm" ? `${scopeLabel} pipeline` : "Dealership pipeline"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[profile.role]} view · {leads.length} lead
          {leads.length === 1 ? "" : "s"} · {formatPeso(activePipelineValue)}{" "}
          active value
        </p>
      </div>

      <StageSummary leads={leads} />

      <Card>
        <CardHeader>
          <CardTitle>Pipeline by agent</CardTitle>
          <CardDescription>
            Lead counts per stage for each agent in {scopeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Agent</th>
                {PIPELINE_STAGES.map((stage) => (
                  <th
                    key={stage}
                    className="whitespace-nowrap px-2 py-3 text-center font-medium"
                  >
                    {STAGE_SHORT_LABELS[stage]}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">
                  Active value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((agent) => {
                const agentLeads = leadsByAgent.get(agent.id) ?? [];
                const counts = countByStage(agentLeads);
                const value = agentLeads
                  .filter((l) => isActiveStage(l.stage) && l.estValue !== null)
                  .reduce((sum, l) => sum + (l.estValue ?? 0), 0);
                return (
                  <tr key={agent.id}>
                    <td className="px-4 py-3 font-medium">{agent.fullName}</td>
                    {PIPELINE_STAGES.map((stage) => (
                      <td
                        key={stage}
                        className="px-2 py-3 text-center text-muted-foreground"
                      >
                        {counts[stage] || "·"}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-medium">
                      {agentLeads.length}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPeso(value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      <DueFollowUps />
    </div>
  );
}
