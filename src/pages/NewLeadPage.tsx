import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { createLead, fetchAgents, type LeadInput } from "@/features/leads/api";
import { LeadForm } from "@/features/leads/LeadForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionHome } from "@/lib/portals";

export function NewLeadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const isAgent = profile?.role === "agent";

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    enabled: !isAgent,
  });

  const base = profile ? sectionHome(profile.role) : "/app";

  const mutation = useMutation({
    mutationFn: (input: LeadInput) => createLead(input),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      navigate(`${base}/leads/${id}`);
    },
  });

  if (!profile) return null;

  // GSMs may only assign within their own team; RLS enforces it, the
  // filter just keeps invalid options out of the picker.
  const agents =
    profile.role === "gsm"
      ? agentsQuery.data?.filter((a) => a.teamId === profile.teamId)
      : agentsQuery.data;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>New lead</CardTitle>
      </CardHeader>
      <CardContent>
        <LeadForm
          agents={isAgent ? undefined : (agents ?? [])}
          submitLabel="Create lead"
          submitting={mutation.isPending}
          error={mutation.error?.message ?? null}
          onSubmit={(input) => mutation.mutate(input)}
          onCancel={() => navigate(`${base}/leads`)}
        />
      </CardContent>
    </Card>
  );
}
