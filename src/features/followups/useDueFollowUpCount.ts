import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { todayDateString } from "@/lib/format";

/**
 * Count of pending follow-ups due today or overdue. RLS scopes the rows
 * (agent → own leads, gsm → team, dealer roles → dealership).
 */
export function useDueFollowUpCount() {
  return useQuery({
    queryKey: ["followups", "due-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("follow_ups")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lte("due_date", todayDateString());

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });
}
