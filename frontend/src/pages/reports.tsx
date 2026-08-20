import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Download, FileBarChart2, History } from "lucide-react";

import { reportApi, departmentApi, employeeApi, leaveTypeApi } from "@/lib/endpoints";
import { useAuth } from "@/context/auth";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/data-display";
import { csvDownload, formatDate } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";

type Tab = "attendance" | "leaves";

function employeeName<T extends { employeeId: string | { name?: string; employeeCode?: string } }>(row: T): { name: string; code: string } {
  const emp = row.employeeId as { name?: string; employeeCode?: string } | string;
  if (typeof emp === "string") return { name: "Employee", code: "" };
  return { name: emp?.name ?? "Employee", code: emp?.employeeCode ?? "" };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "HR" || user?.role === "ADMIN";
  const [tab, setTab] = useState<Tab>("attendance");

  // Shared filters
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Tab-specific filters
  const [attStatus, setAttStatus] = useState("");
  const [leaveStatus, setLeaveStatus] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [page, setPage] = useState(1);

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.list({ limit: 100 }),
    enabled: isAdmin,
  });

  const employees = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => employeeApi.list({ limit: 500 }),
    enabled: isAdmin,
  });

  const leaveTypes = useQuery({
    queryKey: ["leave-types"],
    queryFn: leaveTypeApi.list,
  });

  const filters = {
    departmentId: departmentId || undefined,
    employeeId: employeeId || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const attendance = useQuery({
    queryKey: ["reports", "attendance", { ...filters, status: attStatus, page }],
    queryFn: () => reportApi.attendance({ ...filters, status: attStatus || undefined, page, limit: 10 }),
    enabled: tab === "attendance",
  });

  const leaves = useQuery({
    queryKey: ["reports", "leaves", { ...filters, status: leaveStatus, leaveTypeId, page }],
    queryFn: () => reportApi.leaves({ ...filters, status: leaveStatus || undefined, leaveTypeId: leaveTypeId || undefined, page, limit: 10 }),
    enabled: tab === "leaves",
  });

  const exportCsv = async () => {
    const csvFilters = { ...filters };
    if (tab === "attendance") {
      const csv = await reportApi.attendanceCsv({ ...csvFilters, status: attStatus || undefined });
      csvDownload(`attendance-report-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } else {
      const csv = await reportApi.leavesCsv({ ...csvFilters, status: leaveStatus || undefined, leaveTypeId: leaveTypeId || undefined });
      csvDownload(`leave-report-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }
  };

  const current = tab === "attendance" ? attendance : leaves;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analyze attendance and leave activity across the organization."
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <div className="mb-5 inline-flex rounded-lg bg-surface-100 p-1">
        <button
          onClick={() => { setTab("attendance"); setPage(1); }}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "attendance" ? "bg-white text-primary-700 shadow-sm" : "text-surface-600 hover:text-surface-900"
          }`}
        >
          <History className="size-4" />
          Attendance
        </button>
        <button
          onClick={() => { setTab("leaves"); setPage(1); }}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "leaves" ? "bg-white text-primary-700 shadow-sm" : "text-surface-600 hover:text-surface-900"
          }`}
        >
          <FileBarChart2 className="size-4" />
          Leave
        </button>
      </div>

      <Card>
        <CardBody>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {isAdmin ? (
              <>
                <div>
                  <Label>Department</Label>
                  <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
                    <option value="">All</option>
                    {departments.data?.items.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Employee</Label>
                  <Select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}>
                    <option value="">All</option>
                    {employees.data?.items.map((e) => (
                      <option key={e._id} value={e._id}>{e.name}</option>
                    ))}
                  </Select>
                </div>
              </>
            ) : null}
            {tab === "attendance" ? (
              <div>
                <Label>Status</Label>
                <Select value={attStatus} onChange={(e) => { setAttStatus(e.target.value); setPage(1); }}>
                  <option value="">All</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label>Leave type</Label>
                  <Select value={leaveTypeId} onChange={(e) => { setLeaveTypeId(e.target.value); setPage(1); }}>
                    <option value="">All</option>
                    {leaveTypes.data?.map((lt) => (
                      <option key={lt._id} value={lt._id}>{lt.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={leaveStatus} onChange={(e) => { setLeaveStatus(e.target.value); setPage(1); }}>
                    <option value="">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
          </div>

          {current.isLoading ? (
            <Spinner />
          ) : current.isError ? (
            <ErrorState message={current.error?.message ?? "Failed to load"} onRetry={() => current.refetch()} />
          ) : current.data?.items.length === 0 ? (
            <EmptyState title="No records found" description="Try widening your date range or clearing filters." />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Employee</TH>
                    {tab === "attendance" ? (
                      <>
                        <TH>Date</TH>
                        <TH>Status</TH>
                        <TH>Check-in</TH>
                        <TH>Check-out</TH>
                        <TH>Hours</TH>
                      </>
                    ) : (
                      <>
                        <TH>Leave type</TH>
                        <TH>From → To</TH>
                        <TH>Days</TH>
                        <TH>Status</TH>
                        <TH>Reason</TH>
                      </>
                    )}
                  </TR>
                </THead>
                <TBody>
                  {current.data!.items.map((row) => {
                    const emp = employeeName(row);
                    if (tab === "attendance") {
                      const a = row as Extract<typeof row, { date: string; status: AttendanceStatus; checkInAt?: string; checkOutAt?: string; workingHours?: number }>;
                      return (
                        <TR key={a._id}>
                          <TD>
                            <p className="font-medium text-surface-900">{emp.name}</p>
                            <p className="text-xs text-surface-500">{emp.code}</p>
                          </TD>
                          <TD>{formatDate(a.date)}</TD>
                          <TD><StatusBadge status={a.status} /></TD>
                          <TD className="text-surface-600">{a.checkInAt ? format(parseISO(a.checkInAt), "HH:mm") : "—"}</TD>
                          <TD className="text-surface-600">{a.checkOutAt ? format(parseISO(a.checkOutAt), "HH:mm") : "—"}</TD>
                          <TD className="text-surface-600">{a.workingHours ? `${a.workingHours.toFixed(1)}h` : "—"}</TD>
                        </TR>
                      );
                    }
                    const l = row as Extract<typeof row, { leaveTypeId: string | { name?: string }; fromDate: string; toDate: string; days: number; status: string; reason: string }>;
                    const lt = l.leaveTypeId as { name?: string } | string;
                    return (
                      <TR key={l._id}>
                        <TD>
                          <p className="font-medium text-surface-900">{emp.name}</p>
                          <p className="text-xs text-surface-500">{emp.code}</p>
                        </TD>
                        <TD>{typeof lt === "string" ? "Leave" : lt?.name ?? "Leave"}</TD>
                        <TD className="text-surface-600">{formatDate(l.fromDate)} → {formatDate(l.toDate)}</TD>
                        <TD>{l.days}</TD>
                        <TD><StatusBadge status={l.status} /></TD>
                        <TD className="max-w-48"><p className="truncate text-surface-600" title={l.reason}>{l.reason}</p></TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
              {current.data!.pagination.totalPages > 1 ? (
                <div className="mt-4">
                  <Pagination
                    page={current.data!.pagination.page}
                    totalPages={current.data!.pagination.totalPages}
                    total={current.data!.pagination.total}
                    onChange={setPage}
                  />
                </div>
              ) : null}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}