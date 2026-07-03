import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { completeFollowUp, fetchPendingFollowUps } from "./api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateOnly, todayDateString } from "@/lib/format";
import { sectionHome } from "@/lib/portals";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";

export function DueFollowUps() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: ["followups", "pending"],
    queryFn: fetchPendingFollowUps,
  });

  const doneMutation = useMutation({
    mutationFn: completeFollowUp,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["followups"] }),
  });

  const today = todayDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-ups due</CardTitle>
        <CardDescription>Pending follow-ups, soonest first</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : query.error ? (
          <p className="text-sm text-destructive">{query.error.message}</p>
        ) : query.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due. Schedule follow-ups from a lead page.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {query.data.map((fu) => {
              const overdue = fu.dueDate < today;
              return (
                <li
                  key={fu.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      to={`${profile ? sectionHome(profile.role) : "/app"}/leads/${fu.leadId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {fu.leadCustomerName}
                    </Link>
                    <div className="truncate text-sm text-muted-foreground">
                      {fu.note ?? "Follow up"}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        overdue
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {overdue ? "Overdue · " : ""}
                      {formatDateOnly(fu.dueDate)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={doneMutation.isPending}
                    onClick={() => doneMutation.mutate(fu.id)}
                  >
                    <Check className="h-4 w-4" />
                    Done
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
