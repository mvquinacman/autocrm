export type UserRole =
  | "agent"
  | "gsm"
  | "sales_director"
  | "dealer_principal"
  | "admin";

export type PipelineStage =
  | "new"
  | "contacted"
  | "showroom"
  | "test_drive"
  | "application"
  | "approved"
  | "released";

export const ROLE_LABELS: Record<UserRole, string> = {
  agent: "Sales Agent",
  gsm: "Group Sales Manager",
  sales_director: "Sales Director",
  dealer_principal: "Dealer Principal",
  admin: "Admin",
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "new",
  "contacted",
  "showroom",
  "test_drive",
  "application",
  "approved",
  "released",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  contacted: "Contacted",
  showroom: "Showroom",
  test_drive: "Test Drive",
  application: "Application",
  approved: "Approved",
  released: "Released",
};

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
