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
  halfday: "#0ea5e9",
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
            ? "Organization-wide overview of attendance, leave, and headcount."
            : "Overview of your team's attendance and leave activity."
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active employees"
          value={formatNumber(data.employees.active)}
          hint={`${formatNumber(data.employees.total)} total`}
          icon={<Users className="size-5" />}
          tone="primary"
        />
        <StatCard
          label="Pending leave requests"
          value={formatNumber(data.leaves.pending)}
          hint="Awaiting approval"
          icon={<Plane className="size-5" />}
          tone="amber"
        />
        <StatCard
          label="Approved this month"
          value={formatNumber(data.leaves.approvedThisMonth)}
          hint="Leave approved in current month"
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
              <div className="flex h-full items-center justify-center text-sm text-surface-400">
                No attendance records yet today.
             </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendancePie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                    {attendancePie.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={ATTENDANCE_COLORS[entry.name.toLowerCase().replace(" ", "")]}
                      />
                    ))}
                 </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
               </PieChart>
             </ResponsiveContainer>
            )}
         </CardBody>
       </Card>

        <Card>
          <CardHeader title="Leave requests by type" subtitle="Distribution of leave applications" />
          <CardBody className="h-72">
            {leavesByType.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-surface-400">
                No leave data available.
             </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leavesByType} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="leaves" fill="#2549e5" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
            )}
         </CardBody>
       </Card>
     </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <TrendingUp className="size-5" />
           </div>
            <div>
              <p className="text-sm font-semibold text-surface-900">HR pulse</p>
              <p className="mt-1 text-sm text-surface-500">
                {data.employees.active} of {data.employees.total} employees are active.{" "}
                {data.leaves.pending} leave request{data.leaves.pending === 1 ? "" : "s"} need approval and{" "}
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

  const typeName = (id: string) => leaveTypes.data?.find((t) => t._id === id)?.name ?? "Leave";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Here's a snapshot of your attendance and leave activity."
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
          label="Available leave"
          value={`${formatNumber(totalAvailable)} days`}
          hint={`${formatNumber(totalUsed)} used of ${formatNumber(totalAllocated)} allocated`}
          icon={<Scale className="size-5" />}
          tone="green"
        />
        <StatCard
          label="Leave types"
          value={formatNumber(leaveTypes.data?.length ?? 0)}
          hint="Available to apply for"
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
          <CardHeader title="My leave balances" subtitle="Allocated, used and remaining for this year" />
          <CardBody>
            {balances.isLoading ? (
              <Spinner />
            ) : balances.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-surface-400">
                No leave balances allocated yet. Ask HR to set them up.
             </p>
            ) : (
              <div className="space-y-3">
                {(balances.data ?? []).map((b) => (
                  <div key={b._id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-surface-900">{typeName(b.leaveTypeId)}</span>
                      <span className="text-surface-500">
                        <span className="font-semibold text-surface-900">{b.available}</span> / {b.allocated} days
                     </span>
                   </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                      <div
                        className="h-full rounded-full bg-primary-500"
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
              <p className="py-6 text-center text-sm text-surface-400">No upcoming holidays</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((h) => (
                  <div
                    key={h._id}
                    className="flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50/40 px-3 py-2.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      <span className="text-sm font-bold leading-none">{format(parseISO(h.date), "d")}</span>
                      <span className="text-[10px] uppercase leading-none">{format(parseISO(h.date), "MMM")}</span>
                   </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-900">{h.name}</p>
                      <p className="text-xs text-surface-500">{formatDate(h.date)}</p>
                   </div>
                    {h.optional && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">
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
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <TrendingUp className="size-5" />
           </div>
            <div>
              <p className="text-sm font-semibold text-surface-900">Your snapshot</p>
              <p className="mt-1 text-sm text-surface-500">
                You have {formatNumber(totalAvailable)} leave day{totalAvailable === 1 ? "" : "s"} remaining this year and{" "}
                {upcoming.length} upcoming holiday{upcoming.length === 1 ? "" : "s"} to look forward to.
             </p>
           </div>
         </div>
       </CardBody>
     </Card>
   </div>
  );
}

// End of dashboard page