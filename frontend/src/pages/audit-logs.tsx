import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { auditLogApi } from "@/lib/endpoints";
import { PageHeader, Pagination } from "@/components/ui/data-display";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select, Label } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types";

const ACTION_TONE: Record<string, string> = {
  EMPLOYEE_CREATED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  EMPLOYEE_UPDATED: "bg-sky-50 text-sky-700 ring-sky-200",
  EMPLOYEE_STATUS_CHANGED: "bg-red-50 text-red-700 ring-red-200",
  LEAVE_CREATED: "bg-primary-50 text-primary-700 ring-primary-200",
  LEAVE_APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LEAVE_REJECTED: "bg-red-50 text-red-700 ring-red-200",
  LEAVE_CANCELLED: "bg-amber-50 text-amber-700 ring-amber-200",
  LEAVE_BALANCE_CREATED: "bg-violet-50 text-violet-700 ring-violet-200",
  LEAVE_BALANCE_UPDATED: "bg-violet-50 text-violet-700 ring-violet-200",
  DEPARTMENT_CREATED: "bg-sky-50 text-sky-700 ring-sky-200",
  DEPARTMENT_UPDATED: "bg-sky-50 text-sky-700 ring-sky-200",
  DEPARTMENT_ARCHIVED: "bg-surface-100 text-surface-600 ring-surface-200",
  HOLIDAY_CREATED: "bg-teal-50 text-teal-700 ring-teal-200",
  HOLIDAY_DELETED: "bg-red-50 text-red-700 ring-red-200",
  LEAVE_TYPE_CREATED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  LEAVE_TYPE_UPDATED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

function actorName(log: AuditLog): string {
  const actor = log.actorId as { name?: string } | string | undefined;
  if (!actor) return "System";
  return typeof actor === "string" ? "User" : actor?.name ?? "System";
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const logs = useQuery({
    queryKey: ["audit-logs", { page, action, entityType, from, to }],
    queryFn: () =>
      auditLogApi.list({
        page,
        limit: 15,
        action: action || undefined,
        entityType: entityType || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="A tamper-evident trail of every significant action across the system."
      />

      <Card>
        <CardBody>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="col-span-2">
              <Label>Action</Label>
              <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
                <option value="">All actions</option>
                <option value="EMPLOYEE_CREATED">Employee created</option>
                <option value="EMPLOYEE_UPDATED">Employee updated</option>
                <option value="EMPLOYEE_STATUS_CHANGED">Employee status changed</option>
                <option value="DEPARTMENT_CREATED">Department created</option>
                <option value="DEPARTMENT_UPDATED">Department updated</option>
                <option value="DEPARTMENT_ARCHIVED">Department archived</option>
                <option value="LEAVE_TYPE_CREATED">Leave type created</option>
                <option value="LEAVE_TYPE_UPDATED">Leave type updated</option>
                <option value="LEAVE_BALANCE_CREATED">Balance allocated</option>
                <option value="LEAVE_BALANCE_UPDATED">Balance updated</option>
                <option value="LEAVE_CREATED">Leave created</option>
                <option value="LEAVE_APPROVED">Leave approved</option>
                <option value="LEAVE_REJECTED">Leave rejected</option>
                <option value="LEAVE_CANCELLED">Leave cancelled</option>
                <option value="HOLIDAY_CREATED">Holiday created</option>
                <option value="HOLIDAY_DELETED">Holiday deleted</option>
              </Select>
            </div>
            <div>
              <Label>Entity</Label>
              <Select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="DEPARTMENT">Department</option>
                <option value="LEAVE_TYPE">Leave type</option>
                <option value="LEAVE_REQUEST">Leave request</option>
                <option value="LEAVE_BALANCE">Leave balance</option>
                <option value="HOLIDAY">Holiday</option>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
          </div>

          {logs.isLoading ? (
            <Spinner />
          ) : logs.isError ? (
            <ErrorState message={logs.error?.message ?? "Failed to load"} onRetry={() => logs.refetch()} />
          ) : logs.data?.items.length === 0 ? (
            <EmptyState title="No audit events" description="Nothing matches your filters." />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Timestamp</TH>
                    <TH>Actor</TH>
                    <TH>Action</TH>
                    <TH>Entity</TH>
                    <TH>Details</TH>
                  </TR>
                </THead>
                <TBody>
                  {logs.data!.items.map((log) => (
                    <TR key={log._id}>
                      <TD className="whitespace-nowrap text-surface-600">{formatDateTime(log.createdAt)}</TD>
                      <TD>
                        <span className="flex items-center gap-1.5 font-medium text-surface-900">
                          <ShieldCheck className="size-4 text-surface-400" />
                          {actorName(log)}
                        </span>
                      </TD>
                      <TD>
                        <Badge className={ACTION_TONE[log.action] ?? "bg-surface-100 text-surface-600 ring-surface-200"}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TD>
                      <TD className="text-surface-600">{log.entityType.replace(/_/g, " ")}</TD>
                      <TD className="max-w-md">
                        <LogDetails log={log} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pagination
                page={logs.data!.pagination.page}
                totalPages={logs.data!.pagination.totalPages}
                total={logs.data!.pagination.total}
                onChange={setPage}
              />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function LogDetails({ log }: { log: AuditLog }) {
  const meta = log.metadata;
  const parts: string[] = [];
  if (meta) {
    if (typeof meta.employeeId === "string") parts.push(`Employee: ${meta.employeeId.slice(-6)}`);
    if (typeof meta.leaveTypeId === "string") parts.push(`Leave type: ${meta.leaveTypeId.slice(-6)}`);
    if (typeof meta.year === "number") parts.push(`Year: ${meta.year}`);
    if (typeof meta.allocated === "number") parts.push(`Allocated: ${meta.allocated}`);
  }

  if (parts.length === 0) {
    return <p className="truncate text-xs text-surface-400">—</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-surface-500">
      {parts.map((p, i) => (
        <span key={i} className="rounded bg-surface-100 px-1.5 py-0.5">
          {p}
        </span>
      ))}
    </div>
  );
}