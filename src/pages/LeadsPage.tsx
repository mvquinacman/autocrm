import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useLeads } from "@/features/leads/useLeads";
import { StageBadge } from "@/components/StageBadge";
import { sectionHome } from "@/lib/portals";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatPeso, formatRelative } from "@/lib/format";
import {
  PIPELINE_STAGES,
  SOURCE_LABELS,
  STAGE_LABELS,
  type PipelineStage,
} from "@/lib/types";

export function LeadsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: leads, isPending, error } = useLeads();
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");

  const base = profile ? sectionHome(profile.role) : "/app";
  // Matches leads-insert RLS: agents, gsms, and admins can create leads.
  const canCreate =
    !!profile && ["agent", "gsm", "admin"].includes(profile.role);

  if (isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading leads…</div>;
  }

  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load leads: {error.message}
      </div>
    );
  }

  const filtered =
    stageFilter === "all"
      ? leads
      : leads.filter((lead) => lead.stage === stageFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Filter by stage"
            className="w-40"
            value={stageFilter}
            onChange={(e) =>
              setStageFilter(e.target.value as PipelineStage | "all")
            }
          >
            <option value="all">All stages</option>
            {PIPELINE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </Select>
          {canCreate && (
            <Button onClick={() => navigate(`${base}/leads/new`)}>
              <Plus className="h-4 w-4" />
              New lead
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No leads{stageFilter !== "all" ? " in this stage" : ""}.
            </p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`${base}/leads/${lead.id}`}
                        className="font-medium hover:underline"
                      >
                        {lead.customerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[lead.model, lead.variant]
                        .filter(Boolean)
                        .join(" ") || "—"}
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
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
