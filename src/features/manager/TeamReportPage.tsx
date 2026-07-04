import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAgentLeads } from "@/features/agent/hooks";
import { fetchAgents } from "@/features/leads/api";
import { fetchAllFollowUps } from "@/features/followups/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatPeso, formatPesoCompact } from "@/lib/format";
import type { PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTeams } from "./hooks";
import { buildMonthlyReport, recentMonthOptions, reportToCsv } from "./report";
import "./report-print.css";

const STAGE_BAR: Record<PipelineStage, string> = {
  new: "bg-slate-400",
  contacted: "bg-sky-500",
  showroom: "bg-indigo-500",
  test_drive: "bg-violet-500",
  application: "bg-amber-500",
  approved: "bg-emerald-500",
  released: "bg-emerald-600",
};

const MONTH_OPTIONS = recentMonthOptions(6);

export function TeamReportPage() {
  const { profile } = useAuth();
  const leadsQuery = useAgentLeads(); // RLS scopes to team / dealership
  const teamsQuery = useTeams();
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });
  const followUpsQuery = useQuery({
    queryKey: ["followups", "all"],
    queryFn: fetchAllFollowUps,
  });

  const [monthKey, setMonthKey] = useState(MONTH_OPTIONS[0]?.key ?? "");

  const leads = leadsQuery.data;
  const teams = teamsQuery.data;
  const allAgents = agentsQuery.data;
  const followUps = followUpsQuery.data;

  const isGsm = profile?.role === "gsm";
  const myTeam =
    isGsm && teams ? (teams.find((t) => t.id === profile?.teamId) ?? null) : null;

  const scopeLabel = profile
    ? isGsm
      ? (myTeam?.name ?? "Your team")
      : profile.dealerName
    : "";

  const teamTarget = teams
    ? isGsm
      ? (myTeam?.monthlyTargetUnits ?? 0)
      : teams.reduce((sum, t) => sum + t.monthlyTargetUnits, 0)
    : 0;

  const agents = useMemo(
    () =>
      (allAgents ?? []).filter((a) => !isGsm || a.teamId === profile?.teamId),
    [allAgents, isGsm, profile?.teamId],
  );

  const report = useMemo(() => {
    if (!leads || !followUps || !allAgents || !teams) return null;
    return buildMonthlyReport({
      leads,
      followUps,
      agents,
      scopeLabel,
      teamTarget,
      monthKey,
    });
  }, [leads, followUps, allAgents, teams, agents, scopeLabel, teamTarget, monthKey]);

  if (!profile) return null;

  if (
    leadsQuery.isPending ||
    teamsQuery.isPending ||
    agentsQuery.isPending ||
    followUpsQuery.isPending
  ) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading team report…
      </div>
    );
  }

  const queryError =
    leadsQuery.error ??
    teamsQuery.error ??
    agentsQuery.error ??
    followUpsQuery.error;
  if (queryError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load: {queryError.message}
      </div>
    );
  }

  if (!report) return null;

  const downloadCsv = () => {
    const blob = new Blob([reportToCsv(report)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-performance-${report.monthKey}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const { summary } = report;
  const maxFunnelCount = Math.max(1, ...report.funnel.map((f) => f.count));

  const kpiCells: {
    label: string;
    value: string;
    className?: string;
    title?: string;
  }[] = [
    { label: "Leads created", value: String(summary.leadsCreated) },
    { label: "Sold", value: String(summary.sold) },
    {
      label: "Achievement",
      value:
        summary.achievementPct !== null ? `${summary.achievementPct}%` : "—",
      className:
        summary.achievementPct === null
          ? undefined
          : summary.achievementPct >= 60
            ? "text-emerald-600"
            : "text-amber-600",
    },
    {
      label: "Conversion",
      value:
        summary.conversionPct !== null ? `${summary.conversionPct}%` : "—",
    },
    {
      label: "Weighted pipeline",
      value: formatPesoCompact(Math.round(summary.weightedPipeline)),
      title: formatPeso(Math.round(summary.weightedPipeline)),
    },
    {
      label: "Missed follow-ups",
      value: String(summary.followUpsMissed),
      className: summary.followUpsMissed > 0 ? "text-destructive" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header + controls */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Monthly Team Performance</h1>
          <p className="text-sm text-muted-foreground">
            {report.scopeLabel} · {report.monthLabel}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Select
            aria-label="Report month"
            className="w-44"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* 2. Summary strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpiCells.map((cell) => (
          <Card key={cell.label} className="print-block py-0">
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

      {/* 3. Agent performance table */}
      <Card className="print-block">
        <CardHeader>
          <CardTitle className="text-base">Agent performance</CardTitle>
          <CardDescription>
            Per-agent activity and results for {report.monthLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-2 py-3 text-center font-medium">
                    Leads created
                  </th>
                  <th className="px-2 py-3 text-center font-medium">
                    Showroom+
                  </th>
                  <th className="px-2 py-3 text-center font-medium">
                    Test drive+
                  </th>
                  <th className="px-2 py-3 text-center font-medium">
                    Application+
                  </th>
                  <th className="px-2 py-3 text-center font-medium">Sold</th>
                  <th className="px-2 py-3 text-center font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Achievement</th>
                  <th className="px-2 py-3 text-center font-medium">FU done</th>
                  <th className="px-2 py-3 text-center font-medium">
                    FU missed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.agentRows.map((row) => (
                  <tr key={row.agentId}>
                    <td className="px-4 py-3 font-medium">{row.agentName}</td>
                    <td className="px-2 py-3 text-center">
                      {row.leadsCreated}
                    </td>
                    <td className="px-2 py-3 text-center text-muted-foreground">
                      {row.showroomPlus}
                    </td>
                    <td className="px-2 py-3 text-center text-muted-foreground">
                      {row.testDrivePlus}
                    </td>
                    <td className="px-2 py-3 text-center text-muted-foreground">
                      {row.applicationPlus}
                    </td>
                    <td className="px-2 py-3 text-center font-medium">
                      {row.sold}
                    </td>
                    <td className="px-2 py-3 text-center text-muted-foreground">
                      {row.target}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              row.achievementPct >= 60
                                ? "bg-emerald-500"
                                : "bg-amber-500",
                            )}
                            style={{
                              width: `${Math.min(row.achievementPct, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {row.achievementPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      {row.followUpsDone}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-3 text-center",
                        row.followUpsMissed > 0
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.followUpsMissed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Funnel + lead sources */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="print-block">
          <CardHeader>
            <CardTitle className="text-base">Pipeline funnel</CardTitle>
            <CardDescription>Leads per stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.funnel.map((row) => (
              <div key={row.stage} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">
                  {row.label}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className={cn(
                      "h-full rounded transition-[width]",
                      STAGE_BAR[row.stage],
                    )}
                    style={{ width: `${(row.count / maxFunnelCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-medium">
                  {row.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="print-block">
          <CardHeader>
            <CardTitle className="text-base">Lead sources</CardTitle>
            <CardDescription>
              Where {report.monthLabel} leads came from
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {report.sources.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No leads created this month.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-2 py-3 text-center font-medium">
                        Created
                      </th>
                      <th className="px-2 py-3 text-center font-medium">
                        Sold
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Conversion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.sources.map((row) => (
                      <tr key={row.source}>
                        <td className="px-4 py-3 font-medium">{row.label}</td>
                        <td className="px-2 py-3 text-center">{row.created}</td>
                        <td className="px-2 py-3 text-center">{row.sold}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {row.conversionPct !== null
                            ? `${row.conversionPct}%`
                            : "—"}
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

      {/* 5. Footer */}
      <p className="text-xs text-muted-foreground">
        Generated {report.generatedAt} · AutoPipeline CRM
      </p>
    </div>
  );
}
