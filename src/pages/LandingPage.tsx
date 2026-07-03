import { ArrowRight, Building2, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PORTALS, getLastPortal, type Portal } from "@/lib/portals";

const PORTAL_ICONS: Record<Portal, typeof UserRound> = {
  agent: UserRound,
  gsm: Users,
  dealer: Building2,
};

export function LandingPage() {
  const lastPortal = getLastPortal();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sidebar to-sidebar-deep p-6 text-sidebar-foreground">
      <div className="w-full max-w-3xl space-y-10 text-center">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img src="/favicon.svg" alt="" className="h-12 w-12" />
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              AutoPipeline
            </h1>
          </div>
          <p className="mx-auto max-w-xl text-lg text-sidebar-muted">
            Sales pipeline and promo automation built for Philippine auto
            dealerships — from first inquiry to release.
          </p>
        </div>

        {lastPortal && (
          <Link
            to={`/login?portal=${lastPortal}`}
            className={cn(buttonVariants({ size: "lg" }), "px-6 shadow-lg")}
          >
            Continue as {PORTALS[lastPortal].label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(PORTALS) as Portal[]).map((portal) => {
            const Icon = PORTAL_ICONS[portal];
            return (
              <Link key={portal} to={`/login?portal=${portal}`}>
                <div className="h-full rounded-xl border border-border bg-card p-8 text-card-foreground shadow-md transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-lg font-semibold">
                      {PORTALS[portal].label} Login
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {PORTALS[portal].description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-xs text-sidebar-muted/70">
          Metro East Toyota · demo environment
        </p>
      </div>
    </div>
  );
}
