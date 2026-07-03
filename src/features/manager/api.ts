import { supabase } from "@/lib/supabase";
import { mapLead, type LeadRow } from "@/features/leads/api";
import type { Lead } from "@/lib/types";

export interface Team {
  id: string;
  name: string;
  monthlyTargetUnits: number;
}

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, monthly_target_units")
    .order("name");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    monthlyTargetUnits: row.monthly_target_units,
  }));
}

/**
 * Atomic reassignment via Postgres function: moves agent_id and logs a
 * "Reassigned from X to Y" activity in one transaction. RLS restricts
 * GSMs to their own team on both ends.
 */
export async function reassignLead(
  leadId: string,
  newAgentId: string,
): Promise<Lead> {
  const { data, error } = await supabase
    .rpc("reassign_lead", { p_lead_id: leadId, p_new_agent_id: newAgentId })
    .single<LeadRow>();

  if (error) throw error;
  return mapLead({ ...data, agent: null });
}
