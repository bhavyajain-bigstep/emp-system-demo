import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Plane,
  CheckCircle2,
  CalendarClock,
  TrendingUp,
  LogIn,
  Scale,
  Sparkles,
} from "lucide-react";

import {
  reportApi,
  leaveTypeApi,
  attendanceApi,
  leaveBalanceApi,
  holidayApi,
} from "@/lib/endpoints";
import { useAuth } from "@/context/auth";
import { PageHeader, StatCard } from "@/components/ui/data-display";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner, ErrorState } from "@/components/ui/feedback";
import { formatNumber, formatTime, formatDate } from "@/lib/utils";

const ATTENDANCE_COLORS: Record<string, string> = {
  present: "#10b981",
  late: "#f59e0b",
  absent: "#ef4444",
  halfday: "#3b82f6",
};

export default function DashboardPage() {
  const { user } = useAuth();

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: reportApi.dashboard,
  });

  const leaveTypes = useQuery({
    queryKey: ["leave-types"],
    queryFn: leaveTypeApi.list,
  });

  if (dashboard.isLoading) return <Spinner label="Loading dashboard..." />;
  if (dashboard.isError) {
    return (
      <ErrorState
        message={dashboard.error?.message ?? "Failed to load dashboard"}
        onRetry={() => dashboard.refetch()}
      />
    );
  }

  if (user?.role === "EMPLOYEE") {
    return <EmployeeDashboard />;
  }

  const data = dashboard.data!;
  const typeName = (id: string) =>
    leaveTypes.data?.find((t) => t._id === id)?.name ?? "Other";

  const leavesByType = data.leavesByType.map((item) => ({
    name: typeName(item._id),
    leaves: item.count,
  }));

  const attendancePie = [
    { name: "Present", value: data.attendance.present },
    { name: "Late", value: data.attendance.late },
    { name: "Absent", value: data.attendance.absent },
    { name: "Half Day", value: data.attendance.halfDay },
  ].filter((item) => item.value > 0);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        description={
          user?.role === "ADMIN" || user?.role === "HR"
            ? "Organization-wide overview of attendance, time off, and headcount."
            : "Overview of your team's attendance and time off activity."
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active people"
          value={formatNumber(data.employees.active)}
          hint={`${formatNumber(data.employees.total)} total`}
          icon={<Users className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Pending requests"
          value={formatNumber(data.leaves.pending)}
          hint="Awaiting approval"
          icon={<Plane className="size-5" />}
          tone="amber"
        />
        <StatCard
          label="Approved this month"
          value={formatNumber(data.leaves.approvedThisMonth)}
          hint="Time off approved in current month"
          icon={<CheckCircle2 className="size-5" />}
          tone="green"
        />
        <StatCard
          label="Attendance today"
          value={`${formatNumber(data.attendance.present)} / ${formatNumber(data.attendance.total)}`}
          hint={`${formatNumber(data.attendance.late)} late · ${formatNumber(data.attendance.absent)} absent`}
          icon={<CalendarClock className="size-5" />}
          tone="sky"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Attendance today" subtitle="Breakdown of today's check-ins by status" />
          <CardBody className="h-72">
            {attendancePie.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No attendance records yet today.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {attendancePie.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={ATTENDANCE_COLORS[entry.name.toLowerCase().replace(" ", "")]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Time off requests by type" subtitle="Distribution of time off applications" />
          <CardBody className="h-72">
            {leavesByType.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                No time off data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leavesByType}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-primary)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="leaves" fill="var(--border-focus)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Workforce pulse</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {data.employees.active} of {data.employees.total} employees are active.{" "}
                {data.leaves.pending} time off request{data.leaves.pending === 1 ? "" : "s"} need approval and{" "}
                {data.attendance.late} employee{data.attendance.late === 1 ? "" : "s"} checked in late today.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function EmployeeDashboard() {
  const { user } = useAuth();
  const today = useQuery({
    queryKey: ["attendance", "today"],
    queryFn: attendanceApi.today,
  });

  const balances = useQuery({
    queryKey: ["leave-balances", "mine"],
    queryFn: () => leaveBalanceApi.listMine(),
  });

  const leaveTypes = useQuery({
    queryKey: ["leave-types"],
    queryFn: leaveTypeApi.list,
  });

  const holidays = useQuery({
    queryKey: ["holidays"],
    queryFn: () => holidayApi.list(),
  });

  const todayRecord = today.data;
  const checkedIn = Boolean(todayRecord?.checkInAt);
  const checkedOut = Boolean(todayRecord?.checkOutAt);

  const totalAllocated = (balances.data ?? []).reduce((sum, b) => sum + b.allocated, 0);
  const totalUsed = (balances.data ?? []).reduce((sum, b) => sum + b.used, 0);
  const totalAvailable = (balances.data ?? []).reduce((sum, b) => sum + b.available, 0);

  const upcoming = (holidays.data ?? [])
    .filter((h) => parseISO(h.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const typeName = (id: string) => leaveTypes.data?.find((t) => t._id === id)?.name ?? "Time Off";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Here's a snapshot of your attendance and time off activity."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today"
          value={
            today.isLoading
              ? "…"
              : checkedIn
              ? checkedOut
                ? "Checked out"
                : "Checked in"
              : "Not checked in"
          }
          hint={
            todayRecord
              ? `In ${formatTime(todayRecord.checkInAt)} · Out ${formatTime(todayRecord.checkOutAt)}`
              : "Use the Attendance page to check in"
          }
          icon={<LogIn className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Available time off"
          value={`${formatNumber(totalAvailable)} days`}
          hint={`${formatNumber(totalUsed)} used of ${formatNumber(totalAllocated)} allocated`}
          icon={<Scale className="size-5" />}
          tone="green"
        />
        <StatCard
          label="Time off types"
          value={formatNumber(leaveTypes.data?.length ?? 0)}
          hint="Available to request"
          icon={<Plane className="size-5" />}
          tone="sky"
        />
        <StatCard
          label="Upcoming holidays"
          value={formatNumber(upcoming.length)}
          hint="In the calendar year"
          icon={<CalendarClock className="size-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="My time off balances" subtitle="Allocated, used and remaining for this year" />
          <CardBody>
            {balances.isLoading ? (
              <Spinner />
            ) : balances.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                No time off balances allocated yet. Ask your admin to set them up.
              </p>
            ) : (
              <div className="space-y-3">
                {(balances.data ?? []).map((b) => (
                  <div key={b._id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--text-primary)]">{typeName(b.leaveTypeId)}</span>
                      <span className="text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-primary)]">{b.available}</span> / {b.allocated} days
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${b.allocated > 0 ? (b.used / b.allocated) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Upcoming holidays" subtitle="Next few days off on the calendar" />
          <CardBody>
            {holidays.isLoading ? (
              <Spinner />
            ) : upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">No upcoming holidays</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((h) => (
                  <div
                    key={h._id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-hover)]/50 px-3 py-2.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      <span className="text-sm font-bold leading-none">{format(parseISO(h.date), "d")}</span>
                      <span className="text-[10px] uppercase leading-none">{format(parseISO(h.date), "MMM")}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{h.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(h.date)}</p>
                    </div>
                    {h.optional && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800">
                        <Sparkles className="size-3" />
                        Optional
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Your snapshot</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                You have {formatNumber(totalAvailable)} time off day{totalAvailable === 1 ? "" : "s"} remaining this year and{" "}
                {upcoming.length} upcoming holiday{upcoming.length === 1 ? "" : "s"} to look forward to.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}