import { useMemo } from "react";
import { useAgentLeads } from "@/features/agent/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPeso, formatPesoCompact } from "@/lib/format";
import {
  PIPELINE_STAGES,
  SOURCE_LABELS,
  type Lead,
  type LeadSource,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_SOURCES: LeadSource[] = [
  "facebook_ads",
  "walk_in",
  "referral",
  "website",
  "other",
];

const SOURCE_BAR: Record<LeadSource, string> = {
  facebook_ads: "bg-sky-500",
  walk_in: "bg-emerald-500",
  referral: "bg-violet-500",
  website: "bg-indigo-500",
  other: "bg-slate-400",
};

interface SourceRow {
  source: LeadSource;
  total: number;
  sold: number;
  conversionPct: number;
  engaged: number;
  activeValue: number;
  weightedValue: number;
}

function buildSourceRows(leads: Lead[]): SourceRow[] {
  return ALL_SOURCES.map((source) => {
    const sourceLeads = leads.filter((l) => l.source === source);
    const total = sourceLeads.length;
    const sold = sourceLeads.filter((l) => l.stage === "released").length;
    const active = sourceLeads.filter((l) => l.stage !== "released");
    return {
      source,
      total,
      sold,
      conversionPct: total > 0 ? Math.round((sold / total) * 100) : 0,
      engaged: sourceLeads.filter(
        (l) => PIPELINE_STAGES.indexOf(l.stage) >= 2,
      ).length,
      activeValue: active.reduce((sum, l) => sum + (l.estValue ?? 0), 0),
      weightedValue: active.reduce(
        (sum, l) => sum + ((l.estValue ?? 0) * l.probability) / 100,
        0,
      ),
    };
  })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function LeadSourcesPage() {
  const leadsQuery = useAgentLeads(); // RLS scopes to the whole dealership

  const leads = leadsQuery.data;
  const rows = useMemo(() => buildSourceRows(leads ?? []), [leads]);

  if (leadsQuery.isPending) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading lead sources…
      </div>
    );
  }

  if (leadsQuery.error) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load: {leadsQuery.error.message}
      </div>
    );
  }

  const totalLeads = rows.reduce((sum, r) => sum + r.total, 0);
  const totalSold = rows.reduce((sum, r) => sum + r.sold, 0);
  const overallConversionPct =
    totalLeads > 0 ? Math.round((totalSold / totalLeads) * 100) : 0;

  const biggestSource = rows[0] ?? null;
  const bestConverter = rows
    .filter((r) => r.total >= 2)
    .reduce<SourceRow | null>(
      (best, r) =>
        best === null || r.conversionPct > best.conversionPct ? r : best,
      null,
    );

  const maxSourceCount = Math.max(1, ...rows.map((r) => r.total));

  const kpiCells = [
    { label: "Total leads", value: String(totalLeads) },
    {
      label: "Biggest source",
      value: biggestSource ? SOURCE_LABELS[biggestSource.source] : "—",
      title: biggestSource
        ? `${biggestSource.total} lead${biggestSource.total === 1 ? "" : "s"}`
        : undefined,
    },
    {
      label: "Best converter",
      value: bestConverter
        ? `${SOURCE_LABELS[bestConverter.source]} · ${bestConverter.conversionPct}%`
        : "—",
      title: bestConverter
        ? `${bestConverter.sold} of ${bestConverter.total} leads released`
        : undefined,
    },
    {
      label: "Overall conversion",
      value: totalLeads > 0 ? `${overallConversionPct}%` : "—",
      className:
        totalLeads > 0
          ? overallConversionPct >= 20
            ? "text-emerald-600"
            : "text-amber-600"
          : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Lead Sources</h1>
        <p className="text-sm text-muted-foreground">
          Where leads come from and which sources convert
        </p>
      </div>

      {/* 1. KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCells.map((cell) => (
          <Card key={cell.label} className="py-0">
            <CardContent className="p-4">
              <div
                title={cell.title}
                className={cn(
                  "truncate text-2xl font-bold tracking-tight tabular-nums",
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

      {/* 2. Volume by source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume by source</CardTitle>
          <CardDescription>All-time leads per source</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            rows.map((row) => (
              <div key={row.source} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {SOURCE_LABELS[row.source]}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className={cn(
                      "h-full rounded transition-[width]",
                      SOURCE_BAR[row.source],
                    )}
                    style={{
                      width: `${(row.total / maxSourceCount) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-medium">
                  {row.total}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 3. Source performance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source performance</CardTitle>
          <CardDescription>
            Conversion and pipeline value by source
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-2 py-3 text-center font-medium">Leads</th>
                  <th className="px-2 py-3 text-center font-medium">
                    Engaged (showroom+)
                  </th>
                  <th className="px-2 py-3 text-center font-medium">Sold</th>
                  <th className="px-4 py-3 font-medium">Conversion</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Active value
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.source}>
                    <td className="px-4 py-3 font-medium">
                      {SOURCE_LABELS[row.source]}
                    </td>
                    <td className="px-2 py-3 text-center">{row.total}</td>
                    <td className="px-2 py-3 text-center text-muted-foreground">
                      {row.engaged}
                    </td>
                    <td className="px-2 py-3 text-center font-medium">
                      {row.sold}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              row.conversionPct >= 20
                                ? "bg-emerald-500"
                                : "bg-amber-500",
                            )}
                            style={{
                              width: `${Math.min(row.conversionPct, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {row.conversionPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPeso(row.activeValue)}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      title={formatPeso(Math.round(row.weightedValue))}
                    >
                      {formatPesoCompact(Math.round(row.weightedValue))}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        All-time figures · updates live as leads move
      </p>
    </div>
  );
}
