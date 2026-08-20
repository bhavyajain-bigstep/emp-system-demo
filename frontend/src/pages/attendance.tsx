import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LogIn, LogOut, CalendarClock, Clock } from "lucide-react";

import { attendanceApi, reportApi } from "@/lib/endpoints";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/ui/toast";
import { PageHeader, StatCard, Pagination } from "@/components/ui/data-display";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Input, Label } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage, extractErrorCode } from "@/lib/api";
import { cn, formatTime, formatNumber } from "@/lib/utils";

const todayKey = () => format(new Date(), "yyyy-MM-dd");

function useTodayStatus() {
  return useQuery({
    queryKey: ["attendance", "today", todayKey()],
    queryFn: async () => {
      const res = await attendanceApi.list({ from: todayKey(), to: todayKey() });
      return res.items[0] ?? null;
    },
  });
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const showTeam = user?.role !== "EMPLOYEE";

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Check in and out, track your monthly summary, and review attendance history."
      />

      {showTeam ? (
        <div className="mb-6 inline-flex rounded-lg border border-surface-200 bg-white p-1 shadow-sm">
          {(["mine", "team"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-semibold transition",
                tab === t ? "bg-primary-600 text-white" : "text-surface-600 hover:bg-surface-100"
              )}
            >
              {t === "mine" ? "My attendance" : "Team attendance"}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "mine" ? <MyAttendance /> : <TeamAttendance />}
    </div>
  );
}

function MyAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [page, setPage] = useState(1);

  const today = useTodayStatus();
  const summary = useQuery({
    queryKey: ["attendance", "summary", user?.id, year, month],
    queryFn: () => attendanceApi.summary(year, month),
  });
  const records = useQuery({
    queryKey: ["attendance", "records", user?.id, page],
    queryFn: () => attendanceApi.list({ page, limit: 10 }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
    queryClient.invalidateQueries({ queryKey: ["attendance", "summary"] });
    queryClient.invalidateQueries({ queryKey: ["attendance", "records"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const checkIn = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => {
      toast("success", "Checked in successfully. Have a great day!");
      invalidate();
    },
    onError: (error) => {
      const code = extractErrorCode(error);
      if (code === "ALREADY_CHECKED_IN") toast("info", "You have already checked in for today.");
      else toast("error", getErrorMessage(error));
    },
  });

  const checkOut = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => {
      toast("success", "Checked out successfully. See you tomorrow!");
      invalidate();
    },
    onError: (error) => {
      const code = extractErrorCode(error);
      if (code === "ALREADY_CHECKED_OUT") toast("info", "You have already checked out for today.");
      else if (code === "NO_CHECKIN_FOUND") toast("info", "No check-in found for today. Check in first.");
      else toast("error", getErrorMessage(error));
    },
  });

  const todayRecord = today.data;
  const checkedIn = Boolean(todayRecord?.checkInAt);
  const checkedOut = Boolean(todayRecord?.checkOutAt);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <CalendarClock className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">Today · {format(now, "EEEE, dd MMM yyyy")}</p>
              <p className="mt-1 text-2xl font-bold text-surface-900">
                {checkedIn ? (checkedOut ? "Checked out" : "Checked in") : "Not checked in yet"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-surface-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-surface-400" />
                  Check-in: {formatTime(todayRecord?.checkInAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-surface-400" />
                  Check-out: {formatTime(todayRecord?.checkOutAt)}
                </span>
                {todayRecord?.status ? <StatusBadge status={todayRecord.status} /> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:w-56">
            <Button
              variant="primary"
              size="lg"
              disabled={checkedIn}
              loading={checkIn.isPending}
              onClick={() => checkIn.mutate()}
              className="w-full"
            >
              <LogIn className="size-4" />
              Check in
            </Button>
            <Button
              variant="secondary"
              size="lg"
              disabled={!checkedIn || checkedOut}
              loading={checkOut.isPending}
              onClick={() => checkOut.mutate()}
              className="w-full"
            >
              <LogOut className="size-4" />
              Check out
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="w-40"
          aria-label="Month"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {format(new Date(year, m - 1, 1), "MMMM")}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28"
          aria-label="Year"
        />
      </div>

      {summary.isLoading ? (
        <Spinner />
      ) : summary.isError ? (
        <ErrorState message={summary.error?.message ?? "Failed to load summary"} onRetry={() => summary.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Working days" value={formatNumber(summary.data!.totalWorkingDays)} tone="primary" />
          <StatCard label="Present" value={formatNumber(summary.data!.presentDays)} tone="green" />
          <StatCard label="Late" value={formatNumber(summary.data!.lateDays)} tone="amber" />
          <StatCard label="Half day" value={formatNumber(summary.data!.halfDays)} tone="sky" />
          <StatCard label="Leave" value={formatNumber(summary.data!.leaveDays)} tone="violet" />
          <StatCard label="Absent" value={formatNumber(summary.data!.absentDays)} tone="red" />
        </div>
      )}

      <Card>
        <CardHeader
          title="Attendance percentage"
          subtitle={`${summary.data?.workingDays ?? 0} working days in ${format(new Date(year, month - 1, 1), "MMMM yyyy")}`}
        />
        <CardBody>
          {summary.isLoading ? (
            <Spinner />
          ) : (
            <div className="flex items-center gap-5">
              <div className="relative flex size-28 items-center justify-center">
                <svg className="size-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#2549e5"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${summary.data!.attendancePercentage * 2.638} 264`}
                  />
                </svg>
                <span className="absolute text-xl font-bold text-surface-900">
                  {summary.data!.attendancePercentage}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <p className="text-surface-600">
                  Holidays <span className="font-semibold text-surface-900">{summary.data!.holidays}</span>
                </p>
                <p className="text-surface-600">
                  Weekends <span className="font-semibold text-surface-900">{summary.data!.weekends}</span>
                </p>
                <p className="text-surface-600">
                  Leave days <span className="font-semibold text-surface-900">{summary.data!.leaveDays}</span>
                </p>
                <p className="text-surface-600">
                  Absent <span className="font-semibold text-surface-900">{summary.data!.absentDays}</span>
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent attendance" subtitle="Your latest check-in and check-out history" />
        {records.isLoading ? (
          <Spinner />
        ) : records.isError ? (
          <ErrorState message={records.error?.message ?? "Failed to load records"} onRetry={() => records.refetch()} />
        ) : records.data?.items.length === 0 ? (
          <EmptyState title="No attendance records yet" description="Your check-in history will appear here." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Check-in</TH>
                  <TH>Check-out</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {records.data!.items.map((record) => (
                  <TR key={record._id}>
                    <TD className="font-medium text-surface-900">{format(new Date(record.date), "dd MMM yyyy")}</TD>
                    <TD>{formatTime(record.checkInAt)}</TD>
                    <TD>{formatTime(record.checkOutAt)}</TD>
                    <TD>
                      <StatusBadge status={record.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={records.data!.pagination.page}
              totalPages={records.data!.pagination.totalPages}
              total={records.data!.pagination.total}
              onChange={(p) => setPage(p)}
            />
          </>
        )}
      </Card>
    </div>
  );
}

function TeamAttendance() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ status?: string; from?: string; to?: string }>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["reports", "attendance", page, filters],
    queryFn: () => reportApi.attendance({ page, limit: 10, ...filters }),
  });

  const exportCsv = async () => {
    try {
      const csv = await reportApi.attendanceCsv({ ...filters });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${todayKey()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "Attendance report downloaded.");
    } catch (err) {
      toast("error", getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" value={filters.from ?? ""} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={filters.to ?? ""} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={filters.status ?? ""} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="w-40">
              <option value="">All</option>
              {["PRESENT", "LATE", "HALF_DAY", "ABSENT", "LEAVE"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="outline" onClick={() => setFilters({})}>
            Reset
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Team attendance" subtitle="Attendance records for your team" />
        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <ErrorState message={error?.message ?? "Failed to load"} onRetry={() => refetch()} />
        ) : data?.items.length === 0 ? (
          <EmptyState title="No attendance records" description="No records match the current filters." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Date</TH>
                  <TH>Check-in</TH>
                  <TH>Check-out</TH>
                  <TH>Hours</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {data!.items.map((record) => {
                  const emp = record.employeeId as { name?: string; employeeCode?: string } | undefined;
                  return (
                    <TR key={record._id}>
                      <TD>
                        <p className="font-medium text-surface-900">{emp?.name ?? "—"}</p>
                        <p className="text-xs text-surface-500">{emp?.employeeCode ?? ""}</p>
                      </TD>
                      <TD>{format(new Date(record.date), "dd MMM yyyy")}</TD>
                      <TD>{formatTime(record.checkInAt)}</TD>
                      <TD>{formatTime(record.checkOutAt)}</TD>
                      <TD>{record.workingHours != null ? `${record.workingHours.toFixed(1)}h` : "—"}</TD>
                      <TD>
                        <StatusBadge status={record.status} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination
              page={data!.pagination.page}
              totalPages={data!.pagination.totalPages}
              total={data!.pagination.total}
              onChange={(p) => setPage(p)}
            />
          </>
        )}
      </Card>
    </div>
  );
}