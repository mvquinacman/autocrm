import type { UserRole } from "./types";

export type Portal = "agent" | "gsm" | "dealer";
export type Section = "agent" | "manager" | "dealer";

export const PORTALS: Record<
  Portal,
  { label: string; description: string; roles: UserRole[]; section: Section }
> = {
  agent: {
    label: "Sales Agent",
    description: "Work your leads and follow-ups",
    roles: ["agent"],
    section: "agent",
  },
  gsm: {
    label: "GSM",
    description: "Manage your team's pipeline",
    roles: ["gsm", "sales_director"],
    section: "manager",
  },
  dealer: {
    label: "Dealer",
    description: "Dealership-wide performance",
    roles: ["dealer_principal", "admin"],
    section: "dealer",
  },
};

export function isPortal(value: string | null): value is Portal {
  return value === "agent" || value === "gsm" || value === "dealer";
}

export function portalForRole(role: UserRole): Portal {
  if (role === "agent") return "agent";
  if (role === "gsm" || role === "sales_director") return "gsm";
  return "dealer";
}

export function sectionForRole(role: UserRole): Section {
  return PORTALS[portalForRole(role)].section;
}

export function sectionHome(role: UserRole): string {
  return `/app/${sectionForRole(role)}`;
}

const LAST_PORTAL_KEY = "autocrm.lastPortal";

export function getLastPortal(): Portal | null {
  const value = localStorage.getItem(LAST_PORTAL_KEY);
  return isPortal(value) ? value : null;
}

export function setLastPortal(portal: Portal): void {
  localStorage.setItem(LAST_PORTAL_KEY, portal);
}
