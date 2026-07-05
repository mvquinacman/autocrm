export type UserRole =
  | "agent"
  | "gsm"
  | "sales_director"
  | "dealer_principal"
  | "admin";

// Pipeline v2 — Rommel's validated 12-stage dealership lead lifecycle.
export type PipelineStage =
  | "new_lead"
  | "attempting_contact"
  | "no_response"
  | "contacted"
  | "proposal_sent"
  | "application_submitted"
  | "cash_transaction"
  | "bank_processing"
  | "approved"
  | "denied"
  | "unit_released"
  | "cancelled_lost";

export const ROLE_LABELS: Record<UserRole, string> = {
  agent: "Sales Agent",
  gsm: "Group Sales Manager",
  sales_director: "Sales Director",
  dealer_principal: "Dealer Principal",
  admin: "Admin",
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "new_lead",
  "attempting_contact",
  "no_response",
  "contacted",
  "proposal_sent",
  "application_submitted",
  "cash_transaction",
  "bank_processing",
  "approved",
  "denied",
  "unit_released",
  "cancelled_lost",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new_lead: "New Lead",
  attempting_contact: "Attempting Contact",
  no_response: "No Response",
  contacted: "Contacted",
  proposal_sent: "Proposal Sent",
  application_submitted: "Application Submitted",
  cash_transaction: "Cash Transaction",
  bank_processing: "Bank Processing",
  approved: "Approved",
  denied: "Denied",
  unit_released: "Unit Released",
  cancelled_lost: "Cancelled / Lost",
};

/** Short labels for tight spaces (chevron rail, table headers). */
export const STAGE_SHORT_LABELS: Record<PipelineStage, string> = {
  new_lead: "New",
  attempting_contact: "Attempting",
  no_response: "No Response",
  contacted: "Contacted",
  proposal_sent: "Proposal",
  application_submitted: "Application",
  cash_transaction: "Cash",
  bank_processing: "Bank",
  approved: "Approved",
  denied: "Denied",
  unit_released: "Released",
  cancelled_lost: "Lost",
};

/** The single "sold" stage. */
export const SOLD_STAGE: PipelineStage = "unit_released";

/** Terminal stages — a lead here is closed (won or lost) and out of the
 *  active pipeline for weighted-value and open-lead calculations. */
export const TERMINAL_STAGES: PipelineStage[] = [
  "unit_released",
  "denied",
  "cancelled_lost",
];

/** Negative outcomes (declined or lost). */
export const NEGATIVE_STAGES: PipelineStage[] = ["denied", "cancelled_lost"];

export function isTerminalStage(stage: PipelineStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function isActiveStage(stage: PipelineStage): boolean {
  return !TERMINAL_STAGES.includes(stage);
}

/** Happy-path next stage for the one-tap advance; null at a branch end or
 *  terminal. Cash-vs-bank and the off-ramps are set explicitly. */
export function happyPathNext(stage: PipelineStage): PipelineStage | null {
  switch (stage) {
    case "new_lead":
      return "attempting_contact";
    case "attempting_contact":
      return "contacted";
    case "no_response":
      return "contacted";
    case "contacted":
      return "proposal_sent";
    case "proposal_sent":
      return "application_submitted";
    case "application_submitted":
      return "bank_processing";
    case "cash_transaction":
      return "approved";
    case "bank_processing":
      return "approved";
    case "approved":
      return "unit_released";
    default:
      return null;
  }
}

export type LeadSource =
  | "facebook_ads"
  | "walk_in"
  | "referral"
  | "website"
  | "other";

export const SOURCE_LABELS: Record<LeadSource, string> = {
  facebook_ads: "Facebook Ads",
  walk_in: "Walk-in",
  referral: "Referral",
  website: "Website",
  other: "Other",
};

export interface Lead {
  id: string;
  dealerId: string;
  teamId: string | null;
  agentId: string;
  agentName: string;
  customerName: string;
  phone: string | null;
  source: LeadSource;
  model: string | null;
  variant: string | null;
  estValue: number | null;
  probability: number;
  stage: PipelineStage;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  dealerId: string;
  teamId: string | null;
  role: UserRole;
  fullName: string;
  phone: string | null;
  monthlyTargetUnits: number | null;
  dealerName: string;
  teamName: string | null;
}
