import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLeads } from "@/features/leads/api";
import { fetchPendingFollowUps } from "@/features/followups/api";
import { advanceLeadStage, createLeadAtomic, fetchActivePromos } from "./api";

/** The signed-in agent's leads (RLS returns only their own rows). */
export function useAgentLeads() {
  return useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
}

/** Pending follow-ups for the agent's leads, soonest first. */
export function useAgentFollowUps() {
  return useQuery({
    queryKey: ["followups", "pending"],
    queryFn: fetchPendingFollowUps,
  });
}

export function useActivePromos() {
  return useQuery({ queryKey: ["promos", "active"], queryFn: fetchActivePromos });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLeadAtomic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}

export function useAdvanceStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: advanceLeadStage,
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["lead-history", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}
