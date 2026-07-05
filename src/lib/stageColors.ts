import type { PipelineStage } from "./types";

/** Pill styling (badge background + text) per stage. */
export const STAGE_BADGE: Record<PipelineStage, string> = {
  new_lead: "bg-blue-100 text-blue-700",
  attempting_contact: "bg-amber-100 text-amber-800",
  no_response: "bg-orange-100 text-orange-700",
  contacted: "bg-emerald-100 text-emerald-700",
  proposal_sent: "bg-violet-100 text-violet-700",
  application_submitted: "bg-sky-100 text-sky-700",
  cash_transaction: "bg-teal-100 text-teal-700",
  bank_processing: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
  unit_released: "bg-green-200 text-green-900",
  cancelled_lost: "bg-slate-200 text-slate-600",
};

/** Solid bar/fill color per stage (funnel bars, rail accents). */
export const STAGE_BAR: Record<PipelineStage, string> = {
  new_lead: "bg-blue-500",
  attempting_contact: "bg-amber-500",
  no_response: "bg-orange-500",
  contacted: "bg-emerald-500",
  proposal_sent: "bg-violet-500",
  application_submitted: "bg-sky-500",
  cash_transaction: "bg-teal-500",
  bank_processing: "bg-orange-500",
  approved: "bg-emerald-600",
  denied: "bg-red-500",
  unit_released: "bg-green-700",
  cancelled_lost: "bg-slate-400",
};

/** Dot/text accent color per stage. */
export const STAGE_TEXT: Record<PipelineStage, string> = {
  new_lead: "text-blue-600",
  attempting_contact: "text-amber-600",
  no_response: "text-orange-600",
  contacted: "text-emerald-600",
  proposal_sent: "text-violet-600",
  application_submitted: "text-sky-600",
  cash_transaction: "text-teal-600",
  bank_processing: "text-orange-600",
  approved: "text-emerald-600",
  denied: "text-red-600",
  unit_released: "text-green-700",
  cancelled_lost: "text-slate-500",
};
