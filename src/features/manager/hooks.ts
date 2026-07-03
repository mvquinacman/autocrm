import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchTeams, reassignLead } from "./api";

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
}

export function useReassignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, agentId }: { leadId: string; agentId: string }) =>
      reassignLead(leadId, agentId),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["lead-history", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}

/**
 * Live updates: any change to a visible lead (RLS-filtered server-side)
 * refreshes the lead + follow-up queries, so KPIs, funnel, and lists
 * update without a page refresh.
 */
export function useLeadsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
          queryClient.invalidateQueries({ queryKey: ["followups"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
