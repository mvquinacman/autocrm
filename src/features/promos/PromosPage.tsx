import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAgentLeads } from "@/features/agent/hooks";
import { isActiveStage, type Lead } from "@/lib/types";
import { fetchAllPromos, type PromoDetail } from "./api";

function validityLabel(promo: PromoDetail): string {
  if (promo.startsOn && promo.endsOn) {
    return `${formatDateOnly(promo.startsOn)} – ${formatDateOnly(promo.endsOn)}`;
  }
  if (promo.startsOn) return `From ${formatDateOnly(promo.startsOn)} · No end date`;
  if (promo.endsOn) return `Until ${formatDateOnly(promo.endsOn)}`;
  return "No end date";
}

function PromoCard({
  promo,
  openLeads,
}: {
  promo: PromoDetail;
  openLeads: Lead[];
}) {
  const matches = openLeads.filter(
    (l) => promo.model === null || l.model === promo.model,
  ).length;

  return (
    <Card className="py-0">
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold">{promo.title}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              promo.active
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-muted text-muted-foreground",
            )}
          >
            {promo.active ? "Active" : "Expired"}
          </span>
        </div>

        <div>
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
              promo.model
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {promo.model ?? "All models"}
          </span>
        </div>

        {promo.description && (
          <p className="text-sm text-muted-foreground">{promo.description}</p>
        )}

        <div className="text-xs text-muted-foreground">
          {validityLabel(promo)}
        </div>

        <div className="mt-auto border-t border-border pt-2 text-sm">
          <span
            className={cn(
              matches > 0
                ? "font-semibold text-primary"
                : "text-muted-foreground",
            )}
          >
            {matches} matching open lead{matches === 1 ? "" : "s"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function PromosPage() {
  const promosQuery = useQuery({
    queryKey: ["promos", "all"],
    queryFn: fetchAllPromos,
  });
  const leadsQuery = useAgentLeads();

  if (promosQuery.isPending || leadsQuery.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  const queryError = promosQuery.error ?? leadsQuery.error;
  if (queryError) {
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load promos: {queryError.message}
      </div>
    );
  }

  const promos = promosQuery.data ?? [];
  const openLeads = (leadsQuery.data ?? []).filter((l) =>
    isActiveStage(l.stage),
  );

  const activePromos = promos.filter((p) => p.active);
  const inactivePromos = promos.filter((p) => !p.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Promos</h1>
        <p className="text-sm text-muted-foreground">
          Active offers and how many of your open leads qualify
        </p>
      </div>

      {promos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No promos yet. Your dealer admin can add them soon.
        </p>
      ) : (
        <>
          {activePromos.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {activePromos.map((promo) => (
                <PromoCard key={promo.id} promo={promo} openLeads={openLeads} />
              ))}
            </div>
          )}

          {inactivePromos.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Past promos
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {inactivePromos.map((promo) => (
                  <PromoCard
                    key={promo.id}
                    promo={promo}
                    openLeads={openLeads}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
