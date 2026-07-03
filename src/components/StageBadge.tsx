import { cn } from "@/lib/utils";
import { STAGE_LABELS, type PipelineStage } from "@/lib/types";

const STAGE_STYLES: Record<PipelineStage, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-sky-100 text-sky-700",
  showroom: "bg-indigo-100 text-indigo-700",
  test_drive: "bg-violet-100 text-violet-700",
  application: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  released: "bg-green-200 text-green-900",
};

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
        STAGE_STYLES[stage],
        className,
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}
