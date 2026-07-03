import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateOnly, todayDateString } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  completeFollowUp,
  rescheduleFollowUp,
  type FollowUp,
} from "@/features/followups/api";
import { addLeadActivity } from "@/features/leads/api";
import { useAgentFollowUps } from "./hooks";

type TabKey = "overdue" | "today" | "upcoming";

const TAB_LABELS: Record<TabKey, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
};

const EMPTY_COPY: Record<TabKey, string> = {
  overdue: "All caught up — nothing overdue. 🎉",
  today: "Nothing due today.",
  upcoming: "No upcoming follow-ups. Schedule one from a lead page.",
};

interface CompleteVars {
  fu: FollowUp;
  note: string;
  dealerId: string;
  actorId: string;
}

interface RescheduleVars {
  fu: FollowUp;
  dueDate: string;
}

export function AgentFollowUpsPage() {
  const { profile } = useAuth();
  const followUpsQuery = useAgentFollowUps();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("overdue");
  const [doneTarget, setDoneTarget] = useState<FollowUp | null>(null);
  const [doneNote, setDoneNote] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUp | null>(
    null,
  );
  const [newDate, setNewDate] = useState("");

  const complete = useMutation({
    mutationFn: async ({ fu, note, dealerId, actorId }: CompleteVars) => {
      await completeFollowUp(fu.id);
      if (note !== "") {
        await addLeadActivity({
          leadId: fu.leadId,
          dealerId,
          actorId,
          type: "note",
          detail: `Follow-up done: ${note}`,
        });
      }
    },
    onSuccess: (_data, { fu }) => {
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["lead-history", fu.leadId] });
      setDoneTarget(null);
      setDoneNote("");
    },
  });

  const reschedule = useMutation({
    mutationFn: async ({ fu, dueDate }: RescheduleVars) => {
      await rescheduleFollowUp(fu.id, dueDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      setRescheduleTarget(null);
      setNewDate("");
    },
  });

  if (!profile) return null;

  if (followUpsQuery.isPending) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading follow-ups…
      </div>
    );
  }

  if (followUpsQuery.error) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load follow-ups: {followUpsQuery.error.message}
      </div>
    );
  }

  const followUps = followUpsQuery.data ?? [];
  const today = todayDateString();
  const buckets: Record<TabKey, FollowUp[]> = {
    overdue: followUps.filter((fu) => fu.dueDate < today),
    today: followUps.filter((fu) => fu.dueDate === today),
    upcoming: followUps.filter((fu) => fu.dueDate > today),
  };
  const visible = buckets[tab];

  function openDone(fu: FollowUp) {
    complete.reset();
    setDoneNote("");
    setDoneTarget(fu);
  }

  function openReschedule(fu: FollowUp) {
    reschedule.reset();
    setNewDate("");
    setRescheduleTarget(fu);
  }

  function handleDoneSubmit(e: FormEvent) {
    e.preventDefault();
    if (!doneTarget || !profile) return;
    complete.mutate({
      fu: doneTarget,
      note: doneNote.trim(),
      dealerId: profile.dealerId,
      actorId: profile.id,
    });
  }

  function handleRescheduleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rescheduleTarget || !newDate) return;
    reschedule.mutate({ fu: rescheduleTarget, dueDate: newDate });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">
          {followUps.length} pending follow-up
          {followUps.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Follow-up buckets">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
          const count = buckets[key].length;
          const active = tab === key;
          const alarming = key === "overdue" && count > 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? alarming
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                  : alarming
                    ? "text-destructive hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {TAB_LABELS[key]} ({count})
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {EMPTY_COPY[tab]}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((fu) => (
                <li key={fu.id} className="space-y-3 px-4 py-3 md:space-y-0">
                  {/* Mobile: card with big buttons · md+: single row */}
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                    <div className="min-w-0 md:flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          to={`/app/agent/leads/${fu.leadId}`}
                          className="font-medium hover:underline"
                        >
                          {fu.leadCustomerName}
                        </Link>
                        <span
                          className={cn(
                            "shrink-0 text-sm md:hidden",
                            tab === "overdue"
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatDateOnly(fu.dueDate)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {fu.leadModel ?? "No model"}
                      </p>
                      {fu.note && <p className="mt-1 text-sm">{fu.note}</p>}
                    </div>
                    <span
                      className={cn(
                        "hidden shrink-0 text-sm md:inline",
                        tab === "overdue"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatDateOnly(fu.dueDate)}
                    </span>
                    <div className="grid shrink-0 grid-cols-2 gap-2 md:flex">
                      <Button
                        size="sm"
                        className="min-h-11 md:min-h-0"
                        onClick={() => openDone(fu)}
                      >
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 md:min-h-0"
                        onClick={() => openReschedule(fu)}
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={doneTarget !== null}
        onClose={() => setDoneTarget(null)}
        title="Mark follow-up done"
      >
        <form onSubmit={handleDoneSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fuDoneNote">Note (optional)</Label>
            <Textarea
              id="fuDoneNote"
              autoFocus
              placeholder="How did it go?"
              value={doneNote}
              onChange={(e) => setDoneNote(e.target.value)}
            />
          </div>
          {complete.error && (
            <p role="alert" className="text-sm text-destructive">
              {complete.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDoneTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={complete.isPending}>
              {complete.isPending ? "Saving…" : "Mark done"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={rescheduleTarget !== null}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule follow-up"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fuNewDate">New due date</Label>
            <Input
              id="fuNewDate"
              type="date"
              required
              min={today}
              autoFocus
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          {reschedule.error && (
            <p role="alert" className="text-sm text-destructive">
              {reschedule.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRescheduleTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={reschedule.isPending}>
              {reschedule.isPending ? "Saving…" : "Reschedule"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
