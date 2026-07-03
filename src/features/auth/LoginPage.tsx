import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABELS, type UserRole } from "@/lib/types";
import {
  PORTALS,
  isPortal,
  portalForRole,
  sectionHome,
  setLastPortal,
  type Portal,
} from "@/lib/portals";

interface MismatchError {
  role: UserRole;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<MismatchError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const portalParam = searchParams.get("portal");
  if (!isPortal(portalParam)) {
    return <Navigate to="/" replace />;
  }
  const portalKey: Portal = portalParam;
  const portal = PORTALS[portalKey];

  // Already signed in (and not mid-submit, where a portal mismatch triggers
  // a sign-out): go straight to the user's section.
  if (!loading && session && profile && !submitting && !mismatch) {
    return <Navigate to={sectionHome(profile.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMismatch(null);
    setSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      { email, password },
    );

    if (signInError) {
      setSubmitting(false);
      setError(
        signInError.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : signInError.message,
      );
      return;
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single<{ role: UserRole }>();

    if (profileError) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setError("Could not load your profile. Please contact your admin.");
      return;
    }

    if (!portal.roles.includes(profileRow.role)) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setMismatch({ role: profileRow.role });
      return;
    }

    setLastPortal(portalKey);
    navigate(sectionHome(profileRow.role), { replace: true });
  }

  const correctPortal = mismatch ? portalForRole(mismatch.role) : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-xl">
            AutoPipeline CRM
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {portal.label} portal
              <Link to="/" className="text-primary hover:underline">
                switch
              </Link>
            </span>
          </CardTitle>
          <CardDescription>
            Sign in to the {portal.label.toLowerCase()} portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {mismatch && correctPortal && (
              <div
                role="alert"
                className="space-y-2 rounded-md border border-border bg-muted/50 p-3 text-sm"
              >
                <p>
                  This account is a{" "}
                  <span className="font-medium">
                    {ROLE_LABELS[mismatch.role]}
                  </span>{" "}
                  account, which uses the{" "}
                  <span className="font-medium">
                    {PORTALS[correctPortal].label}
                  </span>{" "}
                  portal.
                </p>
                <Link
                  to={`/login?portal=${correctPortal}`}
                  className="inline-block font-medium text-primary hover:underline"
                  onClick={() => setMismatch(null)}
                >
                  Go to the {PORTALS[correctPortal].label} portal →
                </Link>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
