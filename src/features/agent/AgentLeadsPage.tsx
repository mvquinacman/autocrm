import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { todayDateString } from "@/lib/format";
import {
  PIPELINE_STAGES,
  SOURCE_LABELS,
  STAGE_LABELS,
  type LeadSource,
  type PipelineStage,
} from "@/lib/types";
import {
  useAdvanceStage,
  useAgentFollowUps,
  useAgentLeads,
  useLeadsRealtime,
} from "./hooks";
import { nextFollowUpByLead, sortByUrgency } from "./derive";
import { LeadRow } from "./LeadRow";
import { UndoToast } from "./UndoToast";

type SortMode = "urgency" | "newest";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s-]/g, "");
}

export function AgentLeadsPage() {
  const leadsQuery = useAgentLeads();
  const followUpsQuery = useAgentFollowUps();
  const advance = useAdvanceStage();
  useLeadsRealtime();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [sort, setSort] = useState<SortMode>("urgency");

  if (leadsQuery.isPending || followUpsQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-11 w-full md:h-9" />
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 md:h-16" />
          ))}
        </div>
      </div>
    );
  }

  const queryError = leadsQuery.error ?? followUpsQuery.error;
  if (queryError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load leads: {queryError.message}
      </div>
    );
  }

  const leads = leadsQuery.data ?? [];
  const followUps = followUpsQuery.data ?? [];
  const today = todayDateString();
  const nextByLead = nextFollowUpByLead(followUps);

  const query = normalize(search);
  let visible = leads.filter((lead) => {
    if (stageFilter !== "all" && lead.stage !== stageFilter) return false;
    if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
    if (query) {
      const nameHit = normalize(lead.customerName).includes(query);
      const phoneHit = lead.phone ? normalize(lead.phone).includes(query) : false;
      const modelHit = normalize(
        `${lead.model ?? ""} ${lead.variant ?? ""}`,
      ).includes(query);
      if (!nameHit && !phoneHit && !modelHit) return false;
    }
    return true;
  });

  visible =
    sort === "urgency"
      ? sortByUrgency(visible, nextByLead, today)
      : [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My Leads</h1>
        <p className="text-sm text-muted-foreground">
          {visible.length} of {leads.length} lead{leads.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search leads"
            placeholder="Search name, phone, or model…"
            className="w-full pl-8 sm:w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          aria-label="Filter by stage"
          className="w-[calc(50%-0.25rem)] sm:w-36"
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
        <Select
          aria-label="Filter by source"
          className="w-[calc(50%-0.25rem)] sm:w-36"
          value={sourceFilter}
          onChange={(e) =>
            setSourceFilter(e.target.value as LeadSource | "all")
          }
        >
          <option value="all">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Sort"
          className="w-full sm:w-36"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
        >
          <option value="urgency">By urgency</option>
          <option value="newest">Newest first</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No leads match your filters.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  nextFollowUpDue={nextByLead.get(lead.id)}
                  today={today}
                  onAdvance={advance.advance}
                />
              ))}
            </ul>
          )}
          {advance.error && (
            <p role="alert" className="px-4 pb-3 text-sm text-destructive">
              {advance.error}
            </p>
          )}
        </CardContent>
      </Card>

      <UndoToast
        undoState={advance.undoState}
        onUndo={advance.undo}
        onDismiss={advance.dismissUndo}
      />
    </div>
  );
}
