import { Card, CardContent } from "@/components/ui/card";
import {
  PIPELINE_STAGES,
  STAGE_SHORT_LABELS,
  type Lead,
  type PipelineStage,
} from "@/lib/types";

export function countByStage(leads: Lead[]): Record<PipelineStage, number> {
  const counts = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, 0]),
  ) as Record<PipelineStage, number>;
  for (const lead of leads) counts[lead.stage] += 1;
  return counts;
}

export function StageSummary({ leads }: { leads: Lead[] }) {
  const counts = countByStage(leads);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {PIPELINE_STAGES.map((stage) => (
        <Card key={stage} className="py-0">
          <CardContent className="p-3">
            <div className="text-xl font-bold tabular-nums">
              {counts[stage]}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {STAGE_SHORT_LABELS[stage]}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
