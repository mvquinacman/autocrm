import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { sectionHome } from "@/lib/portals";

/** Gate for /app/*: unauthenticated visitors go back to the landing page. */
export function RequireAuth() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/** /app index: bounce to the signed-in user's own section. */
export function SectionIndexRedirect() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <Navigate to={sectionHome(profile.role)} replace />;
}
