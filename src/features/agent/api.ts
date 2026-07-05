import { supabase } from "@/lib/supabase";
import { LEAD_SELECT, mapLead, type LeadRow } from "@/features/leads/api";
import type { Lead, LeadSource, PipelineStage } from "@/lib/types";

export interface Promo {
  id: string;
  title: string;
  model: string | null;
  description: string | null;
  active: boolean;
  startsOn: string | null;
  endsOn: string | null;
}

interface PromoRow {
  id: string;
  title: string;
  model: string | null;
  description: string | null;
  active: boolean;
  starts_on: string | null;
  ends_on: string | null;
}

export async function fetchActivePromos(): Promise<Promo[]> {
  const { data, error } = await supabase
    .from("promos")
    .select("id, title, model, description, active, starts_on, ends_on")
    .eq("active", true)
    .order("title")
    .overrideTypes<PromoRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    model: row.model,
    description: row.description,
    active: row.active,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  }));
}

/**
 * Atomic stage advance via Postgres function: next stage, +12 probability
 * (cap 100), stage_change activity (trigger), next follow-up in 2 days
 * unless released — all in one transaction.
 */
export async function advanceLeadStage(leadId: string): Promise<Lead> {
  const { data, error } = await supabase
    .rpc("advance_lead_stage", { p_lead_id: leadId })
    .single<LeadRow>();

  if (error) throw error;
  return mapLead({ ...data, agent: null });
}

/**
 * Explicitly set a lead's stage (branch/off-ramp moves like Cash vs Bank,
 * No Response, Denied, Cancelled/Lost). Probability follows the stage.
 */
export async function setLeadStage(
  leadId: string,
  stage: PipelineStage,
): Promise<Lead> {
  const { data, error } = await supabase
    .rpc("set_lead_stage", { p_lead_id: leadId, p_stage: stage })
    .single<LeadRow>();

  if (error) throw error;
  return mapLead({ ...data, agent: null });
}

/**
 * Reverts a stage advance: restores prior stage + probability and removes
 * the auto-created follow-up, atomically. Pass the pre-advance snapshot.
 */
export async function undoLeadAdvance(
  leadId: string,
  prevStage: PipelineStage,
  prevProbability: number,
): Promise<Lead> {
  const { data, error } = await supabase
    .rpc("undo_lead_advance", {
      p_lead_id: leadId,
      p_prev_stage: prevStage,
      p_prev_probability: prevProbability,
    })
    .single<LeadRow>();

  if (error) throw error;
  return mapLead({ ...data, agent: null });
}

/**
 * Existing leads with a matching phone, for the Add Lead duplicate warning.
 * Stored numbers are human-formatted with spaces (e.g. "+63 918 442 7719"),
 * so we can't substring-match on contiguous digits in SQL. Instead we filter
 * server-side on the last 4 digits (always contiguous) to narrow candidates,
 * then compare normalized trailing-9 digits client-side (ignores +63/0/9
 * prefix differences). RLS scopes to what the caller can see.
 */
export async function findLeadsByPhone(phone: string): Promise<Lead[]> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return [];
  const last4 = digits.slice(-4);
  const target9 = digits.slice(-9);

  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .ilike("phone", `%${last4}`)
    .overrideTypes<LeadRow[]>();

  if (error) throw error;
  return (data ?? [])
    .map(mapLead)
    .filter((l) => (l.phone ?? "").replace(/\D/g, "").slice(-9) === target9);
}

export interface NewLeadInput {
  customerName: string;
  phone: string | null;
  model: string | null;
  variant: string | null;
  source: LeadSource;
  estValue: number | null;
}

/**
 * Atomic lead creation via Postgres function: lead (stage new,
 * probability 30) + "Lead created" activity + follow-up due today.
 */
export async function createLeadAtomic(input: NewLeadInput): Promise<Lead> {
  const { data, error } = await supabase
    .rpc("create_lead", {
      p_customer_name: input.customerName,
      p_phone: input.phone,
      p_model: input.model,
      p_variant: input.variant,
      p_source: input.source,
      p_est_value: input.estValue,
    })
    .single<LeadRow>();

  if (error) throw error;
  return mapLead({ ...data, agent: null });
}
