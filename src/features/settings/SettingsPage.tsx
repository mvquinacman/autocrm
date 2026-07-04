import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";
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
import { ROLE_LABELS } from "@/lib/types";

export function SettingsPage() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (profileTimer.current) clearTimeout(profileTimer.current);
      if (passwordTimer.current) clearTimeout(passwordTimer.current);
    },
    [],
  );

  const profileMutation = useMutation({
    mutationFn: async (input: { fullName: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: input.fullName,
          phone: input.phone || null,
        })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profile!.id] });
      setProfileSaved(true);
      if (profileTimer.current) clearTimeout(profileTimer.current);
      profileTimer.current = setTimeout(() => setProfileSaved(false), 3000);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      if (passwordTimer.current) clearTimeout(passwordTimer.current);
      passwordTimer.current = setTimeout(() => setPasswordSaved(false), 3000);
    },
  });

  if (!profile) return null;

  const initials = profile.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileSaved(false);
    profileMutation.mutate({ fullName: fullName.trim(), phone: phone.trim() });
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    passwordMutation.mutate(newPassword);
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and password
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">
            {profile.fullName}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {ROLE_LABELS[profile.role]} · {profile.dealerName}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            How your name appears across the dealership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{session?.user.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd>{ROLE_LABELS[profile.role]}</dd>
            <dt className="text-muted-foreground">Dealership</dt>
            <dd>{profile.dealerName}</dd>
            <dt className="text-muted-foreground">Team</dt>
            <dd>{profile.teamName ?? "—"}</dd>
          </dl>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-full-name">Full name</Label>
              <Input
                id="settings-full-name"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-phone">Phone</Label>
              <Input
                id="settings-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {profileMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {profileMutation.error instanceof Error
                  ? profileMutation.error.message
                  : "Could not save your profile."}
              </p>
            )}
            {profileSaved && (
              <p className="text-sm font-medium text-emerald-600">Saved ✓</p>
            )}
            <Button type="submit" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Minimum 8 characters</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-new-password">New password</Label>
              <Input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-confirm-password">
                Confirm password
              </Label>
              <Input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <p role="alert" className="text-sm text-destructive">
                {passwordError}
              </p>
            )}
            {passwordMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {passwordMutation.error instanceof Error
                  ? passwordMutation.error.message
                  : "Could not update your password."}
              </p>
            )}
            {passwordSaved && (
              <p className="text-sm font-medium text-emerald-600">
                Password updated ✓
              </p>
            )}
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
