import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import {
  addLeadActivity,
  fetchLead,
  fetchLeadActivities,
  updateLead,
  type LeadActivityType,
  type LeadInput,
} from "@/features/leads/api";
import { LeadForm } from "@/features/leads/LeadForm";
import { FollowUpsCard } from "@/features/followups/FollowUpsCard";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdvanceStage } from "@/features/agent/hooks";
import { nextStage } from "@/features/agent/derive";
import { sectionHome } from "@/lib/portals";
import { StageBadge } from "@/components/StageBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatPeso } from "@/lib/format";
import { SOURCE_LABELS, STAGE_LABELS } from "@/lib/types";

const ACTIVITY_TYPE_LABELS: Record<LeadActivityType, string> = {
  note: "Note",
  stage_change: "Stage change",
  call: "Call",
  sms: "SMS",
  messenger: "Messenger",
  showroom_visit: "Showroom visit",
  test_drive: "Test drive",
};

type LoggableType = Exclude<LeadActivityType, "stage_change">;

const LOGGABLE_TYPES: LoggableType[] = [
  "note",
  "call",
  "sms",
  "messenger",
  "showroom_visit",
  "test_drive",
];

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [activityType, setActivityType] = useState<LoggableType>("note");
  const [activityDetail, setActivityDetail] = useState("");
  const advance = useAdvanceStage();

  const leadQuery = useQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLead(id!),
    enabled: !!id,
  });

  const historyQuery = useQuery({
    queryKey: ["lead-history", id],
    queryFn: () => fetchLeadActivities(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead", id] });
    queryClient.invalidateQueries({ queryKey: ["lead-history", id] });
  };

  const editMutation = useMutation({
    mutationFn: (input: LeadInput) => updateLead(id!, input),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });

  const activityMutation = useMutation({
    mutationFn: () =>
      addLeadActivity({
        leadId: id!,
        dealerId: leadQuery.data!.dealerId,
        actorId: profile!.id,
        type: activityType,
        detail: activityDetail.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-history", id] });
      setActivityDetail("");
      setActivityType("note");
    },
  });

  if (leadQuery.isPending) {
    return <div className="py-12 text-center text-muted-foreground">Loading lead…</div>;
  }

  if (leadQuery.error) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load lead: {leadQuery.error.message}
      </div>
    );
  }

  const lead = leadQuery.data;
  const next = nextStage(lead.stage);

  function handleLogActivity(e: FormEvent) {
    e.preventDefault();
    activityMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <Link
        to={`${profile ? sectionHome(profile.role) : "/app"}/leads`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-lg">{lead.customerName}</CardTitle>
                <CardDescription>
                  Handled by {lead.agentName} · Source:{" "}
                  {SOURCE_LABELS[lead.source]}
                </CardDescription>
              </div>
              {!editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editing ? (
                <LeadForm
                  initial={lead}
                  submitLabel="Save changes"
                  submitting={editMutation.isPending}
                  error={editMutation.error?.message ?? null}
                  onSubmit={(input) => editMutation.mutate(input)}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="mt-0.5">{lead.phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Vehicle</dt>
                    <dd className="mt-0.5">
                      {[lead.model, lead.variant].filter(Boolean).join(" ") ||
                        "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Est. value</dt>
                    <dd className="mt-0.5">
                      {lead.estValue !== null ? formatPeso(lead.estValue) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Probability</dt>
                    <dd className="mt-0.5">{lead.probability}%</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
              <CardDescription>
                Notes, contacts, and stage changes — newest first
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleLogActivity} className="space-y-3">
                <div className="flex gap-2">
                  <Select
                    aria-label="Activity type"
                    className="w-40 shrink-0"
                    value={activityType}
                    onChange={(e) =>
                      setActivityType(e.target.value as LoggableType)
                    }
                  >
                    {LOGGABLE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ACTIVITY_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    aria-label="Activity detail"
                    rows={1}
                    required
                    placeholder={
                      activityType === "note"
                        ? "Add a note…"
                        : "What happened? e.g. Discussed financing options"
                    }
                    value={activityDetail}
                    onChange={(e) => setActivityDetail(e.target.value)}
                  />
                </div>
                {activityMutation.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {activityMutation.error.message}
                  </p>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={activityMutation.isPending}
                >
                  {activityMutation.isPending ? "Logging…" : "Log activity"}
                </Button>
              </form>

              {historyQuery.isPending ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : historyQuery.error ? (
                <p className="text-sm text-destructive">
                  {historyQuery.error.message}
                </p>
              ) : historyQuery.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {historyQuery.data.map((entry) => (
                    <li key={entry.id} className="flex flex-col py-2">
                      {entry.type === "stage_change" ? (
                        <span className="text-sm">
                          <span className="text-xs font-medium uppercase text-primary">
                            Stage
                          </span>{" "}
                          {entry.detail}
                        </span>
                      ) : (
                        <span className="text-sm">
                          <span className="text-xs font-medium uppercase text-muted-foreground">
                            {ACTIVITY_TYPE_LABELS[entry.type]}
                          </span>
                          {entry.detail ? ` ${entry.detail}` : ""}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                        {entry.actorName ? ` · ${entry.actorName}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                Pipeline
                <StageBadge stage={lead.stage} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {next ? (
                <Button
                  className="w-full"
                  disabled={advance.isPending}
                  onClick={() => advance.mutate(lead.id)}
                >
                  Move to {STAGE_LABELS[next]}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This lead has been released. Congratulations!
                </p>
              )}
              {advance.error && (
                <p role="alert" className="text-sm text-destructive">
                  {advance.error.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Advancing adds +12% probability and schedules a follow-up in 2
                days.
              </p>
            </CardContent>
          </Card>

          <FollowUpsCard leadId={lead.id} leadAgentId={lead.agentId} />
        </div>
      </div>
    </div>
  );
}
