import { supabase } from "@/lib/supabase";
import { mapLead, type LeadRow } from "@/features/leads/api";
import type { Lead, LeadSource } from "@/lib/types";

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
