import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth/AuthProvider";
import {
  RequireAuth,
  SectionIndexRedirect,
} from "@/features/auth/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { AppShell } from "@/components/AppShell";
import { LandingPage } from "@/pages/LandingPage";
import { AgentDashboardPage } from "@/features/agent/AgentDashboardPage";
import { AgentLeadsPage } from "@/features/agent/AgentLeadsPage";
import { AgentFollowUpsPage } from "@/features/agent/AgentFollowUpsPage";
import { AgentCalendarPage } from "@/features/agent/AgentCalendarPage";
import { ManagerDashboardPage } from "@/features/manager/ManagerDashboardPage";
import { ManagerLeadsPage } from "@/features/manager/ManagerLeadsPage";
import { TeamReportPage } from "@/features/manager/TeamReportPage";
import { LeadSourcesPage } from "@/features/dealer/LeadSourcesPage";
import { TeamDashboardPage } from "@/pages/TeamDashboardPage";
import { LeadsPage } from "@/pages/LeadsPage";
import { NewLeadPage } from "@/pages/NewLeadPage";
import { LeadDetailPage } from "@/pages/LeadDetailPage";
import { FollowUpsPage } from "@/pages/FollowUpsPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/app" element={<RequireAuth />}>
              <Route index element={<SectionIndexRedirect />} />

              <Route path="agent" element={<AppShell section="agent" />}>
                <Route index element={<AgentDashboardPage />} />
                <Route path="leads" element={<AgentLeadsPage />} />
                <Route path="leads/new" element={<NewLeadPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route path="follow-ups" element={<AgentFollowUpsPage />} />
                <Route path="calendar" element={<AgentCalendarPage />} />
                <Route
                  path="promos"
                  element={<PlaceholderPage title="Promos" />}
                />
                <Route
                  path="sales"
                  element={<PlaceholderPage title="My Sales" />}
                />
                <Route
                  path="settings"
                  element={<PlaceholderPage title="Settings" />}
                />
              </Route>

              <Route path="manager" element={<AppShell section="manager" />}>
                <Route index element={<ManagerDashboardPage />} />
                <Route
                  path="team"
                  element={<PlaceholderPage title="My Team" />}
                />
                <Route
                  path="pipeline"
                  element={<PlaceholderPage title="Team Pipeline" />}
                />
                <Route path="leads" element={<ManagerLeadsPage />} />
                <Route path="leads/new" element={<NewLeadPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route path="follow-ups" element={<FollowUpsPage />} />
                <Route
                  path="promos"
                  element={<PlaceholderPage title="Promos" />}
                />
                <Route path="reports" element={<TeamReportPage />} />
                <Route
                  path="settings"
                  element={<PlaceholderPage title="Settings" />}
                />
              </Route>

              <Route path="dealer" element={<AppShell section="dealer" />}>
                <Route index element={<TeamDashboardPage />} />
                <Route
                  path="overview"
                  element={<PlaceholderPage title="Sales Overview" />}
                />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route
                  path="teams"
                  element={<PlaceholderPage title="Teams" />}
                />
                <Route path="sources" element={<LeadSourcesPage />} />
                <Route path="reports" element={<TeamReportPage />} />
                <Route
                  path="settings"
                  element={<PlaceholderPage title="Settings" />}
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
