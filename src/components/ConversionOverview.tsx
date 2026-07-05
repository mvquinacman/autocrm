import { ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";

// Cumulative "reached this depth or deeper" stage sets.
const REACHED_APPLICATION = new Set<PipelineStage>([
  "application_submitted",
  "cash_transaction",
  "bank_processing",
  "approved",
  "unit_released",
]);
const REACHED_PROCESSING = new Set<PipelineStage>([
  "cash_transaction",
  "bank_processing",
  "approved",
  "unit_released",
]);
const REACHED_APPROVED = new Set<PipelineStage>(["approved", "unit_released"]);

function sumSet(
  counts: Record<PipelineStage, number>,
  set: Set<PipelineStage>,
): number {
  let total = 0;
  for (const s of set) total += counts[s];
  return total;
}

function pct(num: number, den: number): string {
  if (den <= 0) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

/** Rommel's "Conversion Overview": application/approval/release rates + a
 *  mini funnel from total leads down to units released. */
export function ConversionOverview({
  counts,
  totalLeads,
}: {
  counts: Record<PipelineStage, number>;
  totalLeads: number;
}) {
  const application = sumSet(counts, REACHED_APPLICATION);
  const processing = sumSet(counts, REACHED_PROCESSING);
  const approved = sumSet(counts, REACHED_APPROVED);
  const released = counts.unit_released;

  const rates = [
    {
      label: "Application Rate",
      hint: "Submitted / Total",
      value: pct(application, totalLeads),
    },
    {
      label: "Approval Rate",
      hint: "Approved / Submitted",
      value: pct(approved, application),
    },
    {
      label: "Release Rate",
      hint: "Released / Approved",
      value: pct(released, approved),
    },
  ];

  const funnel = [
    { label: "Total Leads", value: totalLeads },
    { label: "Application", value: application },
    { label: "Processing", value: processing },
    { label: "Approved", value: approved },
    { label: "Released", value: released },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conversion Overview</CardTitle>
        <CardDescription>Overall pipeline performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {rates.map((r) => (
            <div key={r.label} className="rounded-lg border border-border p-3">
              <div className="text-2xl font-bold tabular-nums text-primary">
                {r.value}
              </div>
              <div className="mt-0.5 text-xs font-medium">{r.label}</div>
              <div className="text-[10px] text-muted-foreground">{r.hint}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {funnel.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              <div
                className={cn(
                  "flex w-24 flex-none flex-col items-center rounded-lg border px-2 py-2 text-center",
                  i === funnel.length - 1
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-border bg-muted/40",
                )}
              >
                <span className="text-lg font-bold tabular-nums">
                  {step.value}
                </span>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {step.label}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {pct(step.value, totalLeads)}
                </span>
              </div>
              {i < funnel.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
