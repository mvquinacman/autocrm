import { ArrowRight, Building2, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            AutoPipeline CRM
          </h1>
          <p className="text-lg text-muted-foreground">
            Sales pipeline and promo automation for Philippine auto dealerships
          </p>
        </div>

        {lastPortal && (
          <Link
            to={`/login?portal=${lastPortal}`}
            className={cn(buttonVariants({ size: "lg" }), "px-6")}
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
                <Card className="h-full transition-colors hover:border-ring hover:bg-muted/50">
                  <CardContent className="flex flex-col items-center gap-3 p-8">
                    <Icon className="h-10 w-10 text-primary" />
                    <div className="text-lg font-semibold">
                      {PORTALS[portal].label} Login
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {PORTALS[portal].description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
