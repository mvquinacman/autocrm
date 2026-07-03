import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface ProfileRow {
  id: string;
  dealer_id: string;
  team_id: string | null;
  role: UserRole;
  full_name: string;
  phone: string | null;
  monthly_target_units: number | null;
  dealers: { name: string } | null;
  teams: { name: string } | null;
}

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, dealer_id, team_id, role, full_name, phone, monthly_target_units, dealers(name), teams(name)",
    )
    .eq("id", userId)
    .single<ProfileRow>();

  if (error) throw error;

  return {
    id: data.id,
    dealerId: data.dealer_id,
    teamId: data.team_id,
    role: data.role,
    fullName: data.full_name,
    phone: data.phone,
    monthlyTargetUnits: data.monthly_target_units,
    dealerName: data.dealers?.name ?? "",
    teamName: data.teams?.name ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const value: AuthContextValue = {
    session,
    profile: profileQuery.data ?? null,
    loading: sessionLoading || (!!userId && profileQuery.isPending),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
