import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { completeFollowUp } from "@/features/followups/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  todayDateString,
} from "@/lib/format";
import { STAGE_LABELS, isActiveStage, type PipelineStage } from "@/lib/types";
import { PipelineHeader } from "@/components/pipeline/PipelineHeader";
import { ConversionOverview } from "@/components/ConversionOverview";
import { cn } from "@/lib/utils";
import {
  useActivePromos,
  useAdvanceStage,
  useAgentFollowUps,
  useAgentLeads,
  useLeadsRealtime,
} from "./hooks";
import {
  countLeadsByStage,
  deriveKpis,
  nextFollowUpByLead,
  sortByUrgency,
} from "./derive";
import { UndoToast } from "./UndoToast";
import { LeadRow } from "./LeadRow";

/** Collapsible on mobile, always expanded from lg (right column). */
function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between rounded-md border border-border bg-card px-4 text-sm font-medium lg:hidden"
      >
        {title}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      <div className={cn("mt-2 lg:mt-0", !open && "hidden lg:block")}>
        {children}
      </div>
    </div>
  );
}

export function AgentDashboardPage() {
  const { profile } = useAuth();
  const leadsQuery = useAgentLeads();
  const followUpsQuery = useAgentFollowUps();
  const promosQuery = useActivePromos();
  const advance = useAdvanceStage();
  useLeadsRealtime();
  const queryClient = useQueryClient();
  const [stageFilter, setStageFilter] = useState<PipelineStage | null>(null);

  const doneMutation = useMutation({
    mutationFn: completeFollowUp,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["followups"] }),
  });

  if (!profile) return null;

  if (leadsQuery.isPending || followUpsQuery.isPending || promosQuery.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-14" />
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24 md:h-16" />
          ))}
        </div>
      </div>
    );
  }

  const queryError =
    leadsQuery.error ?? followUpsQuery.error ?? promosQuery.error;
  if (queryError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load dashboard: {queryError.message}
      </div>
    );
  }

  const leads = leadsQuery.data ?? [];
  const followUps = followUpsQuery.data ?? [];
  const promos = promosQuery.data ?? [];
  const today = todayDateString();

  const kpis = deriveKpis(leads, followUps, profile.monthlyTargetUnits);
  const stageCounts = countLeadsByStage(leads);
  const nextByLead = nextFollowUpByLead(followUps);
  const sorted = sortByUrgency(leads, nextByLead, today);
  const visibleLeads = stageFilter
    ? sorted.filter((l) => l.stage === stageFilter)
    : sorted;

  const todaysFollowUps = followUps.filter(
    (f) => f.status === "pending" && f.dueDate <= today,
  );
  const activeLeads = leads.filter((l) => isActiveStage(l.stage));

  const base = "/app/agent";

  const kpiCells = [
    {
      label: "Sold / monthly target",
      value: `${kpis.soldThisMonth} / ${kpis.target !== null ? kpis.target : "—"}`,
    },
    {
      label: "Achievement",
      value: kpis.achievementPct !== null ? `${kpis.achievementPct}%` : "—",
      className:
        kpis.achievementPct === null
          ? undefined
          : kpis.achievementPct >= 60
            ? "text-emerald-600"
            : "text-amber-600",
    },
    {
      label: "Weighted pipeline",
      value: formatPesoCompact(Math.round(kpis.weightedPipeline)),
      title: formatPeso(Math.round(kpis.weightedPipeline)),
    },
    {
      label: "Follow-ups due",
      value: String(kpis.followUpsDue),
      className: kpis.followUpsDue > 0 ? "text-destructive" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Welcome, {profile.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your pipeline at {profile.dealerName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* 1. KPI strip: 2×2 on mobile, 4-up from md */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

          {/* 2. Pipeline header: connected stage cards, tap to filter */}
          <PipelineHeader
            counts={stageCounts}
            selected={stageFilter}
            onSelect={(s) => setStageFilter(stageFilter === s ? null : s)}
          />

          {/* 3. Lead list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {stageFilter
                  ? `Leads · ${STAGE_LABELS[stageFilter]}`
                  : "My leads"}
              </CardTitle>
              <CardDescription>
                Sorted by follow-up urgency
                {stageFilter ? " · click the stage again to clear" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {visibleLeads.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No leads{stageFilter ? " in this stage" : ""}.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {visibleLeads.map((lead) => (
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
        </div>

        {/* 4. Right column (collapsible sections on mobile) */}
        <div className="min-w-0 space-y-3 lg:space-y-6">
          <CollapsibleSection title="Today's follow-ups">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's follow-ups</CardTitle>
              <CardDescription>Due today or overdue</CardDescription>
            </CardHeader>
            <CardContent>
              {todaysFollowUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing due today. Nice.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {todaysFollowUps.map((fu) => {
                    const overdue = fu.dueDate < today;
                    return (
                      <li
                        key={fu.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <Link
                            to={`${base}/leads/${fu.leadId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {fu.leadCustomerName}
                          </Link>
                          <div className="truncate text-sm text-muted-foreground">
                            {fu.note ?? "Follow up"}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              overdue
                                ? "font-medium text-destructive"
                                : "font-medium text-amber-600",
                            )}
                          >
                            {overdue
                              ? `Overdue · ${formatDateOnly(fu.dueDate)}`
                              : "Today"}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={doneMutation.isPending}
                          onClick={() => doneMutation.mutate(fu.id)}
                        >
                          <Check className="h-4 w-4" />
                          Done
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          </CollapsibleSection>

          <CollapsibleSection title="Promo match">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promo match</CardTitle>
              <CardDescription>
                Active promos vs your active leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              {promos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active promos.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {promos.map((promo) => {
                    const matches = activeLeads.filter(
                      (l) => promo.model === null || l.model === promo.model,
                    ).length;
                    return (
                      <li key={promo.id} className="space-y-1 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">
                            {promo.title}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                              matches > 0
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {matches} lead{matches === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {promo.model ?? "All models"}
                          {promo.description ? ` · ${promo.description}` : ""}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          </CollapsibleSection>
        </div>
      </div>

      {/* 5. Conversion overview */}
      <ConversionOverview counts={stageCounts} totalLeads={leads.length} />

      <UndoToast
        undoState={advance.undoState}
        onUndo={advance.undo}
        onDismiss={advance.dismissUndo}
      />
    </div>
  );
}
