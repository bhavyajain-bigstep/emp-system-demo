import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, UserCog } from "lucide-react";

import { employeeApi, departmentApi } from "@/lib/endpoints";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage, extractErrorCode } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Employee } from "@/types";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-violet-50 text-violet-700 ring-violet-200",
  HR: "bg-sky-50 text-sky-700 ring-sky-200",
  MANAGER: "bg-amber-50 text-amber-700 ring-amber-200",
  EMPLOYEE: "bg-surface-100 text-surface-600 ring-surface-200",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  INACTIVE: "bg-surface-100 text-surface-500 ring-surface-200",
  SUSPENDED: "bg-red-50 text-red-700 ring-red-200",
};

function deptName(e: Employee): string {
  return (e.department as { name?: string } | undefined)?.name ?? "—";
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Employee | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Employee | null>(null);

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  const employees = useQuery({
    queryKey: ["employees", "admin", { page, deptFilter, statusFilter }],
    queryFn: () =>
      employeeApi.list({
        page,
        limit: 10,
        departmentId: deptFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const managers = useQuery({
    queryKey: ["employees", "managers"],
    queryFn: () => employeeApi.list({ limit: 500, role: "MANAGER" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => employeeApi.update(id, { status }),
    onSuccess: () => {
      toast("success", "Employee status updated.");
      setSuspendTarget(null);
      setReactivateTarget(null);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const code = extractErrorCode(error);
      if (code === "LAST_ACTIVE_ADMIN") {
        toast("error", "You can't suspend the last active admin. Promote another admin first.");
      } else {
        toast("error", getErrorMessage(error));
      }
    },
  });

  const filtered = employees.data?.items.filter((e) =>
    search ? e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()) : true
  );

  const meta = employees.data?.pagination;
  const isSuperAdmin = user?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee profiles, roles and departments."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Add employee
          </Button>
        }
      />

      <Card>
        <CardBody>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-surface-400" />
              <Input className="pl-9" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select className="sm:w-56" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
              <option value="">All departments</option>
              {departments.data?.items.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select className="sm:w-44" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>

          {employees.isLoading ? (
            <Spinner />
          ) : employees.isError ? (
            <ErrorState message={employees.error?.message ?? "Failed to load"} onRetry={() => employees.refetch()} />
          ) : filtered?.length === 0 ? (
            <EmptyState title="No employees found" description="Try adjusting your filters or add a new employee." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Department</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH>Joined</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filtered!.map((e) => (
                  <TR key={e._id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-600">
                          {e.name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900">{e.name}</p>
                          <p className="text-xs text-surface-500">
                            {e.email} · {e.employeeCode}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-1.5 text-surface-600">
                        <Building2 className="size-4 text-surface-400" />
                        {deptName(e)}
                      </span>
                    </TD>
                    <TD>
                      <Badge className={ROLE_BADGE[e.role] ?? ""}>{e.role}</Badge>
                    </TD>
                    <TD>
                      <Badge className={STATUS_BADGE[e.status] ?? ""}>{e.status}</Badge>
                    </TD>
                    <TD className="text-surface-600">{e.joiningDate ? formatDate(e.joiningDate) : "—"}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(e)}>
                          <UserCog className="size-4" />
                          Edit
                        </Button>
                        {isSuperAdmin && e.status === "ACTIVE" && e._id !== user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setSuspendTarget(e)}
                          >
                            Suspend
                         </Button>
                        )}
                        {isSuperAdmin && e.status === "SUSPENDED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setReactivateTarget(e)}
                          >
                            Reactivate
                         </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {meta && meta.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-4">
              <p className="text-sm text-surface-500">
                Page {meta.page} of {meta.totalPages} · {meta.total} employees
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <EmployeeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        departments={departments.data?.items ?? []}
        managers={managers.data?.items ?? []}
      />
      <EmployeeFormModal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        employee={editTarget}
        departments={departments.data?.items ?? []}
        managers={managers.data?.items ?? []}
      />
      <ConfirmDialog
        open={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() =>
          suspendTarget && statusMutation.mutate({ id: suspendTarget._id, status: "SUSPENDED" })
        }
        title="Suspend employee"
        message={
          suspendTarget
            ? `${suspendTarget.name} will no longer be able to sign in. You can reactivate them later.`
            : ""
        }
        confirmLabel="Suspend employee"
        loading={statusMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(reactivateTarget)}
        onClose={() => setReactivateTarget(null)}
        onConfirm={() =>
          reactivateTarget && statusMutation.mutate({ id: reactivateTarget._id, status: "ACTIVE" })
        }
        title="Reactivate employee"
        message={
          reactivateTarget
            ? `${reactivateTarget.name} will be able to sign in again.`
            : ""
        }
        confirmLabel="Reactivate"
        loading={statusMutation.isPending}
      />
   </div>
  );
}

function EmployeeFormModal({
  open,
  onClose,
  employee,
  departments,
  managers,
}: {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
  departments: { _id: string; name: string }[];
  managers: Employee[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(employee);

  const [employeeCode, setEmployeeCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [departmentId, setDepartmentId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name,
        role,
        departmentId,
        managerId: managerId || undefined,
      };
      if (isEdit) {
        payload.status = status;
      } else {
        payload.employeeCode = employeeCode;
        payload.email = email;
        payload.password = password;
        payload.joiningDate = joiningDate;
      }
      return isEdit ? employeeApi.update(employee!._id, payload) : employeeApi.create(payload);
    },
    onSuccess: () => {
      toast("success", isEdit ? "Employee updated." : "Employee created. They can now sign in.");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      if (msg.includes("exists")) toast("error", "That employee code or email is already in use.");
      else toast("error", msg);
    },
  });

  // Reset form when the modal target changes
  const key = employee?._id ?? "create";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (key !== lastKey) {
    setLastKey(key);
    setEmployeeCode(employee?.employeeCode ?? "");
    setName(employee?.name ?? "");
    setEmail(employee?.email ?? "");
    setPassword("");
    setRole(employee?.role ?? "EMPLOYEE");
    setDepartmentId(employee?.departmentId ?? "");
    setManagerId(employee?.managerId ?? "");
    setJoiningDate(employee?.joiningDate?.slice(0, 10) ?? "");
    setStatus(employee?.status ?? "ACTIVE");
    setErrors({});
  }

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (isEdit) {
      if (!name) next.name = "Name is required";
      if (!departmentId) next.departmentId = "Department is required";
    } else {
      if (!employeeCode) next.employeeCode = "Employee code is required";
      if (!name) next.name = "Name is required";
      if (!email) next.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email";
      if (password.length < 8) next.password = "Password must be at least 8 characters";
      if (!departmentId) next.departmentId = "Department is required";
      if (!joiningDate) next.joiningDate = "Joining date is required";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${employee?.name ?? "employee"}` : "Add employee"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {isEdit ? "Save changes" : "Create employee"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEdit ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Employee code</Label>
              <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="e.g. EMP001" />
              <FieldError message={errors.employeeCode} />
            </div>
            <div>
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
              <FieldError message={errors.name} />
            </div>
          </div>
        ) : (
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <FieldError message={errors.name} />
          </div>
        )}

        {!isEdit ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Email address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
                <FieldError message={errors.email} />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
                <FieldError message={errors.password} />
              </div>
            </div>
            <div>
              <Label>Joining date</Label>
              <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              <FieldError message={errors.joiningDate} />
            </div>
          </>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Department</Label>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Select a department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.departmentId} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="HR">HR</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Reporting manager</Label>
            <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">No manager</option>
              {managers
                .filter((m) => m._id !== employee?._id)
                .map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.employeeCode})
                  </option>
                ))}
            </Select>
          </div>
          {isEdit ? (
            <div>
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}