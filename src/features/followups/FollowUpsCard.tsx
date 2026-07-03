import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  completeFollowUp,
  createFollowUp,
  fetchLeadFollowUps,
} from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateOnly, todayDateString } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FollowUpsCard({
  leadId,
  leadAgentId,
}: {
  leadId: string;
  leadAgentId: string;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const query = useQuery({
    queryKey: ["followups", "lead", leadId],
    queryFn: () => fetchLeadFollowUps(leadId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["followups"] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      createFollowUp({
        dealerId: profile!.dealerId,
        leadId,
        agentId: leadAgentId,
        dueDate,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      invalidate();
      setDueDate("");
      setNote("");
    },
  });

  const doneMutation = useMutation({
    mutationFn: completeFollowUp,
    onSuccess: invalidate,
  });

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (dueDate) addMutation.mutate();
  }

  const today = todayDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Follow-ups</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="followUpDue">Due</Label>
              <Input
                id="followUpDue"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpNote">Note</Label>
              <Input
                id="followUpNote"
                placeholder="e.g. Call about financing options"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          {addMutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {addMutation.error.message}
            </p>
          )}
          <Button type="submit" size="sm" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Scheduling…" : "Schedule follow-up"}
          </Button>
        </form>

        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : query.error ? (
          <p className="text-sm text-destructive">{query.error.message}</p>
        ) : query.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No follow-ups scheduled yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {query.data.map((fu) => {
              const overdue = fu.status === "pending" && fu.dueDate < today;
              return (
                <li
                  key={fu.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-sm",
                        fu.status === "done" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {fu.note ?? "Follow up"}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        overdue || fu.status === "missed"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {overdue ? "Overdue · " : ""}
                      {formatDateOnly(fu.dueDate)}
                      {fu.status === "done" ? " · Done" : ""}
                      {fu.status === "missed" ? " · Missed" : ""}
                    </div>
                  </div>
                  {fu.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={doneMutation.isPending}
                      onClick={() => doneMutation.mutate(fu.id)}
                    >
                      <Check className="h-4 w-4" />
                      Done
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
