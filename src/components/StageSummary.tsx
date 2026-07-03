import { Card, CardContent } from "@/components/ui/card";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type Lead,
  type PipelineStage,
} from "@/lib/types";

export function countByStage(leads: Lead[]): Record<PipelineStage, number> {
  return leads.reduce<Record<PipelineStage, number>>(
    (acc, lead) => {
      acc[lead.stage] += 1;
      return acc;
    },
    {
      new: 0,
      contacted: 0,
      showroom: 0,
      test_drive: 0,
      application: 0,
      approved: 0,
      released: 0,
    },
  );
}

export function StageSummary({ leads }: { leads: Lead[] }) {
  const counts = countByStage(leads);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {PIPELINE_STAGES.map((stage) => (
        <Card key={stage} className="py-0">
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{counts[stage]}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {STAGE_LABELS[stage]}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
