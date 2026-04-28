import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "@/components/auth/Login";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import LeadsKanban from "@/pages/LeadsKanban";
import LeadsTable from "@/pages/LeadsTable";
import Analytics from "@/pages/Analytics";
import LeadDetail from "@/pages/LeadDetail";
import PartnerManagement from "@/pages/PartnerManagement";
import PartnerDashboard from "@/pages/PartnerDashboard";
import ProtectedRoute from "@/context/ProtectedRoutes";
import BulkMessaging from "./pages/BulkMessaging";
import McaCampaigns from "@/pages/McaCampaigns";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/context/UserContext";

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <UserProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads-kanban"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <LeadsKanban />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads-table"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <LeadsTable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads-details/:id"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <LeadDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bulk-messaging"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <BulkMessaging />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mca-campaigns"
              element={
                <ProtectedRoute allowedRoles={["isAdmin", "isSales"]}>
                  <McaCampaigns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner-management"
              element={
                <ProtectedRoute allowedRoles={["isAdmin"]}>
                  <PartnerManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner-dashboard"
              element={
                <ProtectedRoute allowedRoles={["isPartner"]}>
                  <PartnerDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </>
  );
}
