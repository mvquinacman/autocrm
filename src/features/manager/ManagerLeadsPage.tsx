import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserRoundPen } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAgentLeads } from "@/features/agent/hooks";
import { fetchAgents } from "@/features/leads/api";
import { StageBadge } from "@/components/StageBadge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatPeso, formatRelative } from "@/lib/format";
import { SOURCE_LABELS, type Lead } from "@/lib/types";
import { useLeadsRealtime, useReassignLead } from "./hooks";

export function ManagerLeadsPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const leadsQuery = useAgentLeads(); // RLS scopes to the GSM's team
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const reassign = useReassignLead();
  const [reassigning, setReassigning] = useState<Lead | null>(null);
  const [newAgentId, setNewAgentId] = useState("");
  useLeadsRealtime();

  if (!profile) return null;

  if (leadsQuery.isPending || agentsQuery.isPending) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading team leads…
      </div>
    );
  }

  const queryError = leadsQuery.error ?? agentsQuery.error;
  if (queryError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load leads: {queryError.message}
      </div>
    );
  }

  const leads = leadsQuery.data ?? [];
  const isGsm = profile.role === "gsm";
  const agents = (agentsQuery.data ?? []).filter(
    (a) => !isGsm || a.teamId === profile.teamId,
  );

  const agentFilter = searchParams.get("agent") ?? "all";
  const visible =
    agentFilter === "all"
      ? leads
      : leads.filter((l) => l.agentId === agentFilter);

  const filterName = agents.find((a) => a.id === agentFilter)?.fullName;

  function openReassign(lead: Lead) {
    setReassigning(lead);
    setNewAgentId("");
    reassign.reset();
  }

  function confirmReassign() {
    if (!reassigning || !newAgentId) return;
    reassign.mutate(
      { leadId: reassigning.id, agentId: newAgentId },
      { onSuccess: () => setReassigning(null) },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Team leads{filterName ? ` · ${filterName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            {visible.length} of {leads.length} lead
            {leads.length === 1 ? "" : "s"}
          </p>
        </div>
        <Select
          aria-label="Filter by agent"
          className="w-48"
          value={agentFilter}
          onChange={(e) => {
            const value = e.target.value;
            setSearchParams(value === "all" ? {} : { agent: value });
          }}
        >
          <option value="all">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.fullName}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No leads.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Est. value</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/app/manager/leads/${lead.id}`}
                        className="font-medium hover:underline"
                      >
                        {lead.customerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[lead.model, lead.variant].filter(Boolean).join(" ") ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lead.estValue !== null
                        ? formatPeso(lead.estValue)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {SOURCE_LABELS[lead.source]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.agentName}
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatRelative(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Reassign lead"
                        onClick={() => openReassign(lead)}
                      >
                        <UserRoundPen className="h-4 w-4" />
                        Reassign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={reassigning !== null}
        onClose={() => setReassigning(null)}
        title="Reassign lead"
      >
        {reassigning && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Move <span className="font-medium text-foreground">{reassigning.customerName}</span>{" "}
              from {reassigning.agentName} to:
            </p>
            <div className="space-y-2">
              <Label htmlFor="reassignAgent">New agent</Label>
              <Select
                id="reassignAgent"
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
              >
                <option value="" disabled>
                  Select an agent…
                </option>
                {agents
                  .filter((a) => a.id !== reassigning.agentId)
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName}
                    </option>
                  ))}
              </Select>
            </div>
            {reassign.error && (
              <p role="alert" className="text-sm text-destructive">
                {reassign.error.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReassigning(null)}>
                Cancel
              </Button>
              <Button
                disabled={!newAgentId || reassign.isPending}
                onClick={confirmReassign}
              >
                {reassign.isPending ? "Reassigning…" : "Reassign"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
