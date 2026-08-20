import { useQuery } from "@tanstack/react-query";
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
import { Users, Plane, CheckCircle2, CalendarClock, TrendingUp } from "lucide-react";

import { reportApi, leaveTypeApi } from "@/lib/endpoints";
import { useAuth } from "@/context/auth";
import { PageHeader } from "@/components/ui/data-display";
import { StatCard } from "@/components/ui/data-display";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner, ErrorState } from "@/components/ui/feedback";
import { formatNumber } from "@/lib/utils";

const ATTENDANCE_COLORS: Record<string, string> = {
  present: "#10b981",
  late: "#f59e0b",
  absent: "#ef4444",
  halfDay: "#0ea5e9",
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
    return <ErrorState message={dashboard.error?.message ?? "Failed to load dashboard"} onRetry={() => dashboard.refetch()} />;
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

  const isEmployee = user?.role === "EMPLOYEE";
  const isAdmin = user?.role === "HR" || user?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        description={
          isEmployee
            ? "Here's a snapshot of your attendance and leave activity."
            : isAdmin
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
          <CardHeader
            title="Attendance today"
            subtitle="Breakdown of today's check-ins by status"
          />
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
                      <Cell key={entry.name} fill={ATTENDANCE_COLORS[entry.name.toLowerCase().replace(" ", "")]} />
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