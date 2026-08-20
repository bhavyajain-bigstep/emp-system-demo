import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { RequireAuth, RequireRole, PublicOnly } from "@/components/guards";
import { PageSpinner } from "@/components/ui/feedback";

import LoginPage from "@/pages/login";

const DashboardPage = lazy(() => import("@/pages/dashboard"));
const AttendancePage = lazy(() => import("@/pages/attendance"));
const LeavesPage = lazy(() => import("@/pages/leaves"));
const LeaveApprovalsPage = lazy(() => import("@/pages/leave-approvals"));
const LeaveBalancesPage = lazy(() => import("@/pages/leave-balances"));
const HolidaysPage = lazy(() => import("@/pages/holidays"));
const EmployeesPage = lazy(() => import("@/pages/employees"));
const DepartmentsPage = lazy(() => import("@/pages/departments"));
const LeaveTypesPage = lazy(() => import("@/pages/leave-types"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const AuditLogsPage = lazy(() => import("@/pages/audit-logs"));

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leaves" element={<LeavesPage />} />
          <Route path="/leave-balances" element={<LeaveBalancesPage />} />
          <Route path="/holidays" element={<HolidaysPage />} />

          <Route
            path="/leaves/approvals"
            element={
              <RequireRole roles={["MANAGER", "HR", "ADMIN"]}>
                <LeaveApprovalsPage />
              </RequireRole>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireRole roles={["MANAGER", "HR", "ADMIN"]}>
                <ReportsPage />
              </RequireRole>
            }
          />
          <Route
            path="/employees"
            element={
              <RequireRole roles={["HR", "ADMIN"]}>
                <EmployeesPage />
              </RequireRole>
            }
          />
          <Route
            path="/departments"
            element={
              <RequireRole roles={["HR", "ADMIN"]}>
                <DepartmentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/leave-types"
            element={
              <RequireRole roles={["HR", "ADMIN"]}>
                <LeaveTypesPage />
              </RequireRole>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <RequireRole roles={["HR", "ADMIN"]}>
                <AuditLogsPage />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}