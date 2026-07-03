import { supabase } from "@/lib/supabase";
import type { Lead, LeadSource, PipelineStage } from "@/lib/types";

export interface LeadRow {
  id: string;
  dealer_id: string;
  team_id: string | null;
  agent_id: string;
  customer_name: string;
  phone: string | null;
  source: LeadSource;
  model: string | null;
  variant: string | null;
  est_value: number | null;
  probability: number;
  stage: PipelineStage;
  created_at: string;
  updated_at: string;
  agent: { full_name: string } | null;
}

export const LEAD_SELECT =
  "id, dealer_id, team_id, agent_id, customer_name, phone, source, model, variant, est_value, probability, stage, created_at, updated_at, agent:profiles!leads_agent_id_fkey(full_name)";

export function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    dealerId: row.dealer_id,
    teamId: row.team_id,
    agentId: row.agent_id,
    agentName: row.agent?.full_name ?? "",
    customerName: row.customer_name,
    phone: row.phone,
    source: row.source,
    model: row.model,
    variant: row.variant,
    estValue: row.est_value === null ? null : Number(row.est_value),
    probability: row.probability,
    stage: row.stage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** RLS decides which rows come back — no client-side scoping. */
export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("created_at", { ascending: false })
    .overrideTypes<LeadRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapLead);
}

export async function fetchLead(id: string): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .single<LeadRow>();

  if (error) throw error;
  return mapLead(data);
}

export interface LeadInput {
  dealerId: string;
  agentId: string;
  customerName: string;
  phone: string | null;
  source: LeadSource;
  model: string | null;
  variant: string | null;
  estValue: number | null;
  probability: number;
}

function toRow(input: LeadInput) {
  return {
    dealer_id: input.dealerId,
    agent_id: input.agentId,
    customer_name: input.customerName,
    phone: input.phone,
    source: input.source,
    model: input.model,
    variant: input.variant,
    est_value: input.estValue,
    probability: input.probability,
  };
}

export async function createLead(input: LeadInput): Promise<string> {
  const { data, error } = await supabase
    .from("leads")
    .insert(toRow(input))
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data.id;
}

export async function updateLead(id: string, input: LeadInput): Promise<void> {
  const { error } = await supabase.from("leads").update(toRow(input)).eq("id", id);
  if (error) throw error;
}

export async function updateLeadStage(
  id: string,
  stage: PipelineStage,
): Promise<void> {
  const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
  if (error) throw error;
}

export type LeadActivityType =
  | "note"
  | "stage_change"
  | "call"
  | "sms"
  | "messenger"
  | "showroom_visit"
  | "test_drive";

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  detail: string | null;
  actorName: string | null;
  createdAt: string;
}

interface LeadActivityRow {
  id: string;
  type: LeadActivityType;
  detail: string | null;
  created_at: string;
  actor: { full_name: string } | null;
}

export async function fetchLeadActivities(
  leadId: string,
): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select(
      "id, type, detail, created_at, actor:profiles!lead_activities_actor_id_fkey(full_name)",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .overrideTypes<LeadActivityRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    detail: row.detail,
    actorName: row.actor?.full_name ?? null,
    createdAt: row.created_at,
  }));
}

export interface TestDriveActivity {
  id: string;
  leadId: string;
  customerName: string;
  model: string | null;
  detail: string | null;
  createdAt: string;
}

interface TestDriveActivityRow {
  id: string;
  lead_id: string;
  detail: string | null;
  created_at: string;
  lead: { customer_name: string; model: string | null } | null;
}

/** Logged test drives across all leads visible to the caller. */
export async function fetchTestDriveActivities(): Promise<TestDriveActivity[]> {
  const { data, error } = await supabase
    .from("lead_activities")
    .select(
      "id, lead_id, detail, created_at, lead:leads!lead_activities_lead_id_fkey(customer_name, model)",
    )
    .eq("type", "test_drive")
    .order("created_at", { ascending: false })
    .overrideTypes<TestDriveActivityRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    customerName: row.lead?.customer_name ?? "",
    model: row.lead?.model ?? null,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}

export interface NewActivityInput {
  leadId: string;
  dealerId: string;
  actorId: string;
  type: Exclude<LeadActivityType, "stage_change">;
  detail: string | null;
}

export async function addLeadActivity(input: NewActivityInput): Promise<void> {
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: input.leadId,
    dealer_id: input.dealerId,
    actor_id: input.actorId,
    type: input.type,
    detail: input.detail,
  });
  if (error) throw error;
}

export interface AgentOption {
  id: string;
  fullName: string;
  teamId: string | null;
  targetUnits: number | null;
}

export async function fetchAgents(): Promise<AgentOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, team_id, monthly_target_units")
    .eq("role", "agent")
    .order("full_name");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    teamId: row.team_id,
    targetUnits: row.monthly_target_units,
  }));
}
