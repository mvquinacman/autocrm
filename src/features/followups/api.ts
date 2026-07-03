import { supabase } from "@/lib/supabase";

export type FollowUpStatus = "pending" | "done" | "missed";

export interface FollowUp {
  id: string;
  leadId: string;
  leadCustomerName: string;
  leadModel: string | null;
  agentId: string;
  agentName: string;
  dueDate: string;
  note: string | null;
  status: FollowUpStatus;
  completedAt: string | null;
}

interface FollowUpRow {
  id: string;
  lead_id: string;
  agent_id: string;
  due_date: string;
  note: string | null;
  status: FollowUpStatus;
  completed_at: string | null;
  lead: { customer_name: string; model: string | null } | null;
  agent: { full_name: string } | null;
}

const FOLLOW_UP_SELECT =
  "id, lead_id, agent_id, due_date, note, status, completed_at, lead:leads!follow_ups_lead_id_fkey(customer_name, model), agent:profiles!follow_ups_agent_id_fkey(full_name)";

function mapFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    leadId: row.lead_id,
    leadCustomerName: row.lead?.customer_name ?? "",
    leadModel: row.lead?.model ?? null,
    agentId: row.agent_id,
    agentName: row.agent?.full_name ?? "",
    dueDate: row.due_date,
    note: row.note,
    status: row.status,
    completedAt: row.completed_at,
  };
}

/** Pending follow-ups across all leads visible to the caller (RLS-scoped). */
export async function fetchPendingFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select(FOLLOW_UP_SELECT)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .overrideTypes<FollowUpRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapFollowUp);
}

export async function fetchLeadFollowUps(leadId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select(FOLLOW_UP_SELECT)
    .eq("lead_id", leadId)
    .order("due_date", { ascending: false })
    .overrideTypes<FollowUpRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapFollowUp);
}

export interface FollowUpInput {
  dealerId: string;
  leadId: string;
  agentId: string;
  dueDate: string;
  note: string | null;
}

export async function createFollowUp(input: FollowUpInput): Promise<void> {
  const { error } = await supabase.from("follow_ups").insert({
    dealer_id: input.dealerId,
    lead_id: input.leadId,
    agent_id: input.agentId,
    due_date: input.dueDate,
    note: input.note,
  });
  if (error) throw error;
}

export async function completeFollowUp(id: string): Promise<void> {
  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** All follow-ups visible to the caller, any status (for the calendar). */
export async function fetchAllFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select(FOLLOW_UP_SELECT)
    .order("due_date", { ascending: true })
    .overrideTypes<FollowUpRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapFollowUp);
}

/** Moves the due date; a missed/pending follow-up becomes pending again. */
export async function rescheduleFollowUp(
  id: string,
  dueDate: string,
): Promise<void> {
  const { error } = await supabase
    .from("follow_ups")
    .update({ due_date: dueDate, status: "pending", completed_at: null })
    .eq("id", id);
  if (error) throw error;
}
