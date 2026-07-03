import { useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BarChart3,
  BellRing,
  Building2,
  CalendarDays,
  ClipboardList,
  Layers,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Plus,
  Settings,
  Tags,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AddLeadDialog } from "@/features/agent/AddLeadDialog";
import { useDueFollowUpCount } from "@/features/followups/useDueFollowUpCount";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/types";
import { sectionForRole, sectionHome, type Section } from "@/lib/portals";
import { useIsMobile } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  /** Path relative to the section home ('' = section index). */
  to: string;
  icon: LucideIcon;
  /** Show the due-follow-ups badge on this item. */
  dueBadge?: boolean;
}

const NAV_CONFIG: Record<Section, NavItem[]> = {
  agent: [
    { label: "Dashboard", to: "", icon: LayoutDashboard },
    { label: "My Leads", to: "leads", icon: ClipboardList },
    { label: "Follow-ups", to: "follow-ups", icon: BellRing, dueBadge: true },
    { label: "Calendar", to: "calendar", icon: CalendarDays },
    { label: "Promos", to: "promos", icon: Tags },
    { label: "My Sales", to: "sales", icon: TrendingUp },
    { label: "Settings", to: "settings", icon: Settings },
  ],
  manager: [
    { label: "Team Dashboard", to: "", icon: LayoutDashboard },
    { label: "My Team", to: "team", icon: Users },
    { label: "Team Pipeline", to: "pipeline", icon: Layers },
    { label: "Leads", to: "leads", icon: ClipboardList },
    {
      label: "Follow-up Monitor",
      to: "follow-ups",
      icon: BellRing,
      dueBadge: true,
    },
    { label: "Promos", to: "promos", icon: Tags },
    { label: "Reports", to: "reports", icon: BarChart3 },
    { label: "Settings", to: "settings", icon: Settings },
  ],
  dealer: [
    { label: "Executive Dashboard", to: "", icon: LayoutDashboard },
    { label: "Sales Overview", to: "overview", icon: TrendingUp },
    { label: "Pipeline", to: "leads", icon: Layers },
    { label: "Teams", to: "teams", icon: Building2 },
    { label: "Lead Sources", to: "sources", icon: PieChart },
    { label: "Reports", to: "reports", icon: BarChart3 },
    { label: "Settings", to: "settings", icon: Settings },
  ],
};

/** Mobile bottom tab bar: first 3 nav items + "More". */
const MOBILE_TABS = ["Dashboard", "My Leads", "Follow-ups"];

const COLLAPSE_KEY = "autocrm.sidebarCollapsed";

function DueBadge({ compact }: { compact: boolean }) {
  const { data: count } = useDueFollowUpCount();
  if (!count) return null;

  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground",
        compact && "absolute -right-1.5 -top-1",
      )}
    >
      {count}
    </span>
  );
}

export function AppShell({ section }: { section: Section }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
  );
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!profile) return null;

  // Wrong section for this role → send them to their own.
  if (sectionForRole(profile.role) !== section) {
    return <Navigate to={sectionHome(profile.role)} replace />;
  }

  const base = `/app/${section}`;
  const items = NAV_CONFIG[section];
  // Agents get the bottom tab bar on phones; GSM/dealer keep the sidebar
  // but forced to the icon rail so nothing breaks on narrow screens.
  const isAgentMobile = section === "agent" && isMobile;
  const collapsedView = collapsed || (isMobile && section !== "agent");

  const initials = profile.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const tabItems = items.filter((i) => MOBILE_TABS.includes(i.label));
  const moreItems = items.filter((i) => !MOBILE_TABS.includes(i.label));
  const showFab =
    isAgentMobile &&
    (location.pathname === base || location.pathname === `${base}/leads`);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width]",
          collapsedView ? "w-16" : "w-64",
          isAgentMobile ? "hidden md:flex" : "flex",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-4",
            collapsedView ? "justify-center" : "justify-between",
          )}
        >
          {!collapsedView && (
            <span className="flex min-w-0 items-center gap-2 px-1">
              <img src="/favicon.svg" alt="" className="h-7 w-7 shrink-0" />
              <span className="truncate text-[15px] font-bold tracking-tight">
                AutoPipeline
              </span>
            </span>
          )}
          <button
            type="button"
            aria-label={collapsedView ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
            className="hidden rounded-md p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground md:block"
          >
            {collapsedView ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {section === "agent" && (
          <div className={cn("pb-3", collapsedView ? "px-2" : "px-3")}>
            <Button
              className="w-full"
              size={collapsedView ? "sm" : "default"}
              onClick={() => setAddLeadOpen(true)}
              title="Add Lead"
            >
              <Plus className="h-4 w-4" />
              {!collapsedView && "Add Lead"}
            </Button>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to === "" ? base : `${base}/${item.to}`}
                end={item.to === ""}
                title={collapsedView ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    collapsedView && "justify-center px-2",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsedView && <span className="flex-1">{item.label}</span>}
                {item.dueBadge && <DueBadge compact={collapsedView} />}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsedView && "flex-col gap-2",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-sidebar-foreground">
              {initials}
            </div>
            {!collapsedView && (
              <div className="min-w-0 flex-1 text-sm">
                <div className="truncate font-medium">{profile.fullName}</div>
                <div className="truncate text-xs text-sidebar-muted">
                  {ROLE_LABELS[profile.role]}
                </div>
                <div className="truncate text-xs text-sidebar-muted">
                  {profile.dealerName}
                </div>
              </div>
            )}
            <button
              type="button"
              aria-label="Log out"
              title="Log out"
              onClick={handleSignOut}
              className="rounded-md p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main
        className={cn(
          "min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6",
          isAgentMobile &&
            "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6",
        )}
      >
        <Outlet />
      </main>

      {/* Floating + Add Lead (agent mobile, dashboard + leads only) */}
      {showFab && (
        <button
          type="button"
          aria-label="Add Lead"
          onClick={() => setAddLeadOpen(true)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Bottom tab bar (agent mobile) */}
      {section === "agent" && (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {tabItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to === "" ? base : `${base}/${item.to}`}
                end={item.to === ""}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    isActive && !moreOpen
                      ? "text-primary"
                      : "text-muted-foreground",
                  )
                }
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {item.dueBadge && <DueBadge compact />}
                </span>
                {item.label === "My Leads" ? "Leads" : item.label}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              moreOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </nav>
      )}

      {/* "More" sheet (agent mobile) */}
      {section === "agent" && moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">More</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.label}
                    to={`${base}/${item.to}`}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <div className="truncate font-medium">{profile.fullName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[profile.role]} · {profile.dealerName}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {section === "agent" && (
        <AddLeadDialog
          open={addLeadOpen}
          onClose={() => setAddLeadOpen(false)}
        />
      )}
    </div>
  );
}
