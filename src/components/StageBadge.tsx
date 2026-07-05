import { cn } from "@/lib/utils";
import { STAGE_BADGE } from "@/lib/stageColors";
import { STAGE_LABELS, type PipelineStage } from "@/lib/types";

export function StageBadge({
  stage,
  className,
}: {
  stage: PipelineStage;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STAGE_BADGE[stage],
        className,
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
