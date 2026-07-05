import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Phone } from "lucide-react";
import { StageBadge } from "@/components/StageBadge";
import { Button } from "@/components/ui/button";
import {
  SOURCE_LABELS,
  STAGE_SHORT_LABELS,
  isTerminalStage,
  type Lead,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { telHref } from "@/lib/contact";
import { nextStage, urgencyFor, type UrgencyTone } from "./derive";

const URGENCY_CLASSES: Record<UrgencyTone, string> = {
  overdue: "font-medium text-destructive",
  today: "font-medium text-amber-600",
  upcoming: "text-muted-foreground",
  none: "text-muted-foreground/60",
};

interface LeadRowProps {
  lead: Lead;
  nextFollowUpDue: string | undefined;
  today: string;
  onAdvance: (lead: Lead) => void;
}

export function LeadRow({
  lead,
  nextFollowUpDue,
  today,
  onAdvance,
}: LeadRowProps) {
  const navigate = useNavigate();
  const urgency = urgencyFor(nextFollowUpDue, today);
  const next = nextStage(lead.stage);
  const isClosed = isTerminalStage(lead.stage);
  const detailPath = `/app/agent/leads/${lead.id}`;
  const initials = lead.customerName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <li
      className="cursor-pointer px-4 py-3 md:cursor-default"
      onClick={(e) => {
        // Mobile: tapping the card (not a button/link inside it) opens detail
        if (window.matchMedia("(min-width: 768px)").matches) return;
        if ((e.target as HTMLElement).closest("button, a")) return;
        navigate(detailPath);
      }}
    >
      {/* Mobile: stacked card · md+: single row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-center gap-3 md:flex-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </span>
          <div className="min-w-0">
          <Link
            to={detailPath}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.customerName}
          </Link>
          <div className="truncate text-sm text-muted-foreground">
            {[lead.model ?? "No model", SOURCE_LABELS[lead.source]].join(" · ")}
            {lead.phone && (
              <>
                {" · "}
                <a
                  href={telHref(lead.phone)}
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lead.phone}
                </a>
              </>
            )}
          </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:contents">
          <StageBadge stage={lead.stage} />
          <span
            className={cn(
              "text-xs md:w-24 md:shrink-0 md:text-right",
              URGENCY_CLASSES[isClosed ? "none" : urgency.tone],
            )}
          >
            {isClosed ? "—" : urgency.label}
          </span>
          <div
            className="ml-auto w-20 shrink-0 md:ml-0"
            title={`${lead.probability}% probability`}
          >
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${lead.probability}%` }}
              />
            </div>
            <div className="mt-0.5 text-right text-[10px] text-muted-foreground">
              {lead.probability}%
            </div>
          </div>
        </div>

        {lead.phone && (
          <a
            href={telHref(lead.phone)}
            aria-label={`Call ${lead.customerName}`}
            title={`Call ${lead.customerName}`}
            onClick={(e) => e.stopPropagation()}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}

        {lead.stage === "unit_released" ? (
          <span className="flex items-center justify-center gap-1 text-sm font-medium text-emerald-600 md:w-32 md:shrink-0">
            <Check className="h-4 w-4" />
            Released
          </span>
        ) : next ? (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 w-full justify-center md:min-h-0 md:w-32 md:shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(lead);
            }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {STAGE_SHORT_LABELS[next]}
          </Button>
        ) : (
          <span className="flex items-center justify-center text-xs text-muted-foreground md:w-32 md:shrink-0">
            Closed
          </span>
        )}
      </div>
    </li>
  );
}
