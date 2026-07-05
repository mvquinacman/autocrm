import { ChevronRight } from "lucide-react";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type PipelineStage,
} from "@/lib/types";
import { STAGE_BAR, STAGE_TEXT } from "@/lib/stageColors";
import { cn } from "@/lib/utils";
import { STAGE_GROUP, STAGE_ICON, STAGE_NUMBER } from "./stageMeta";

interface PipelineHeaderProps {
  counts: Record<PipelineStage, number>;
  /** Optional click-to-filter (agent dashboard). */
  selected?: PipelineStage | null;
  onSelect?: (stage: PipelineStage) => void;
}

/** Grouped flow with a connector between groups, matching Rommel's mockup:
 *  1→2→3→4→5→6 → [7.1/7.2] → [8A/8B] → 9   ·   ✕ */
const FLOW: PipelineStage[][] = [
  ["new_lead"],
  ["attempting_contact"],
  ["no_response"],
  ["contacted"],
  ["proposal_sent"],
  ["application_submitted"],
  ["cash_transaction", "bank_processing"],
  ["approved", "denied"],
  ["unit_released"],
];

function StageCard({
  stage,
  count,
  selected,
  onSelect,
  compact,
}: {
  stage: PipelineStage;
  count: number;
  selected: boolean;
  onSelect?: (stage: PipelineStage) => void;
  compact?: boolean;
}) {
  const Icon = STAGE_ICON[stage];
  const clickable = !!onSelect;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onSelect?.(stage)}
      title={`${STAGE_LABELS[stage]}: ${count} lead(s)`}
      className={cn(
        "flex w-[104px] flex-none flex-col items-center gap-1 overflow-hidden rounded-xl border bg-card text-center transition-all",
        compact ? "py-2" : "py-2.5",
        clickable && "hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <span className="flex items-center gap-1.5 px-2">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground">
          {STAGE_NUMBER[stage]}
        </span>
        <Icon className={cn("h-4 w-4", STAGE_TEXT[stage])} />
      </span>
      <span className="text-2xl font-bold tabular-nums leading-none">
        {count}
      </span>
      <span className="line-clamp-2 px-1 text-[10px] font-medium leading-tight text-foreground">
        {STAGE_LABELS[stage]}
      </span>
      <span
        className={cn(
          "mt-0.5 w-full py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white",
          STAGE_BAR[stage],
        )}
      >
        {STAGE_GROUP[stage]}
      </span>
    </button>
  );
}

export function PipelineHeader({
  counts,
  selected = null,
  onSelect,
  compact,
}: PipelineHeaderProps & { compact?: boolean }) {
  return (
    <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
      {FLOW.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1">
          <div className="flex flex-col gap-1">
            {group.map((stage) => (
              <StageCard
                key={stage}
                stage={stage}
                count={counts[stage]}
                selected={selected === stage}
                onSelect={onSelect}
                compact={compact}
              />
            ))}
          </div>
          {gi < FLOW.length - 1 && (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          )}
        </div>
      ))}

      {/* Cancelled / Lost sits apart from the happy flow */}
      <div className="ml-1 flex items-center border-l border-dashed border-border pl-2">
        <StageCard
          stage="cancelled_lost"
          count={counts.cancelled_lost}
          selected={selected === "cancelled_lost"}
          onSelect={onSelect}
          compact={compact}
        />
      </div>
    </div>
  );
}

export { PIPELINE_STAGES };
