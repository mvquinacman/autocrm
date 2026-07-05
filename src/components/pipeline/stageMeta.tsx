import {
  Ban,
  BadgeCheck,
  Banknote,
  Car,
  ClipboardCheck,
  FileText,
  Landmark,
  MailX,
  MessagesSquare,
  PhoneCall,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { PipelineStage } from "@/lib/types";

/** Icon per stage (matches Rommel's pipeline mockup). */
export const STAGE_ICON: Record<PipelineStage, LucideIcon> = {
  new_lead: UserPlus,
  attempting_contact: PhoneCall,
  no_response: MailX,
  contacted: MessagesSquare,
  proposal_sent: FileText,
  application_submitted: ClipboardCheck,
  cash_transaction: Banknote,
  bank_processing: Landmark,
  approved: BadgeCheck,
  denied: XCircle,
  unit_released: Car,
  cancelled_lost: Ban,
};

/** Step number / label shown on the card badge. */
export const STAGE_NUMBER: Record<PipelineStage, string> = {
  new_lead: "1",
  attempting_contact: "2",
  no_response: "3",
  contacted: "4",
  proposal_sent: "5",
  application_submitted: "6",
  cash_transaction: "7.1",
  bank_processing: "7.2",
  approved: "8A",
  denied: "8B",
  unit_released: "9",
  cancelled_lost: "✕",
};

/** Group band label under each card. */
export const STAGE_GROUP: Record<PipelineStage, string> = {
  new_lead: "NEW",
  attempting_contact: "ACTION",
  no_response: "FOLLOW UP",
  contacted: "ENGAGED",
  proposal_sent: "PROPOSAL",
  application_submitted: "APPLICATION",
  cash_transaction: "PROCESSING",
  bank_processing: "PROCESSING",
  approved: "POSITIVE",
  denied: "NEGATIVE",
  unit_released: "COMPLETED",
  cancelled_lost: "CLOSED",
};
