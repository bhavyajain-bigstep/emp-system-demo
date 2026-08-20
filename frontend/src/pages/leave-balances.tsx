import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Scale, Plus, Pencil } from "lucide-react";

import { leaveBalanceApi, leaveTypeApi, employeeApi } from "@/lib/endpoints";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage } from "@/lib/api";
import type { LeaveBalance } from "@/types";

function balanceLabel(b: LeaveBalance): string {
  const lt = b.leaveType as { name?: string } | undefined;
  return lt?.name ?? "Leave";
}

export default function LeaveBalancesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveBalance | null>(null);

  const isAdmin = user?.role === "HR" || user?.role === "ADMIN";
  const year = new Date().getFullYear();

  const mine = useQuery({
    queryKey: ["leave-balances", "mine"],
    queryFn: () => leaveBalanceApi.listMine(year),
  });

  const all = useQuery({
    queryKey: ["leave-balances", "all"],
    queryFn: () => leaveBalanceApi.listAll({ year }),
    enabled: isAdmin,
  });

  const editMutation = useMutation({
    mutationFn: ({ id, allocated }: { id: string; allocated: number }) =>
      leaveBalanceApi.update(id, allocated),
    onSuccess: () => {
      toast("success", "Allocation updated.");
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Leave Balances"
        description={isAdmin ? "View and manage leave allocations across the organization." : "Your allocated, used and remaining leave days."}
        actions={
          isAdmin ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Allocate balance
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader title="My balances" subtitle={`Leave year ${year}`} />
        {mine.isLoading ? (
          <Spinner />
        ) : mine.isError ? (
          <ErrorState message={mine.error?.message ?? "Failed to load"} onRetry={() => mine.refetch()} />
        ) : mine.data?.length === 0 ? (
          <EmptyState title="No balances allocated" description="Your leave balances will appear here once allocated by HR." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Leave type</TH>
                <TH>Allocated</TH>
                <TH>Used</TH>
                <TH>Available</TH>
              </TR>
            </THead>
            <TBody>
              {mine.data!.map((b) => (
                <TR key={b._id}>
                  <TD>
                    <div className="flex items-center gap-2 font-medium text-surface-900">
                      <Scale className="size-4 text-surface-400" />
                      {balanceLabel(b)}
                    </div>
                  </TD>
                  <TD>{b.allocated}</TD>
                  <TD>{b.used}</TD>
                  <TD>
                    <span className={`font-semibold ${b.available <= 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {b.available}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {isAdmin ? (
        <Card className="mt-6">
          <CardHeader title="All allocations" subtitle="Every employee's balance across all leave types" />
          {all.isLoading ? (
            <Spinner />
          ) : all.isError ? (
            <ErrorState message={all.error?.message ?? "Failed to load"} onRetry={() => all.refetch()} />
          ) : all.data?.items.length === 0 ? (
            <EmptyState title="No allocations yet" description="Allocate the first leave balance to get started." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Leave type</TH>
                  <TH>Year</TH>
                  <TH>Allocated</TH>
                  <TH>Used</TH>
                  <TH>Available</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {all.data!.items.map((b) => {
                  const emp = b.employee as { name?: string; employeeCode?: string } | undefined;
                  return (
                    <TR key={b._id}>
                      <TD>
                        <p className="font-medium text-surface-900">{emp?.name ?? "—"}</p>
                        <p className="text-xs text-surface-500">{emp?.employeeCode ?? ""}</p>
                      </TD>
                      <TD>{balanceLabel(b)}</TD>
                      <TD>{b.year}</TD>
                      <TD>{b.allocated}</TD>
                      <TD>{b.used}</TD>
                      <TD>
                        <span className={`font-semibold ${b.available <= 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {b.available}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(b)}>
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      ) : null}

      <AllocateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit allocation"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={editMutation.isPending}
              onClick={() =>
                editTarget &&
                editMutation.mutate({ id: editTarget._id, allocated: editTarget.allocated })
              }
            >
              Save changes
            </Button>
          </>
        }
      >
        <EditAllocationForm target={editTarget} />
      </Modal>
    </div>
  );
}

function EditAllocationForm({ target }: { target: LeaveBalance | null }) {
  const [allocated, setAllocated] = useState(target?.allocated ?? 0);

  if (!target) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-600">
        Set the total allocated days for{" "}
        <span className="font-semibold text-surface-900">{(target.employee as { name?: string })?.name ?? "this employee"}</span>{" "}
        on <span className="font-semibold text-surface-900">{balanceLabel(target)}</span>. Used days will be preserved.
      </p>
      <div>
        <Label>Allocated days</Label>
        <Input
          type="number"
          min={target.used}
          value={allocated}
          onChange={(e) => setAllocated(Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-surface-500">
          Currently used: {target.used} · Available after save: {Math.max(allocated - target.used, 0)}
        </p>
      </div>
    </div>
  );
}

function AllocateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [allocated, setAllocated] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const employees = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => employeeApi.list({ limit: 500 }),
  });

  const leaveTypes = useQuery({
    queryKey: ["leave-types"],
    queryFn: leaveTypeApi.list,
  });

  const mutation = useMutation({
    mutationFn: () => leaveBalanceApi.create({ employeeId, leaveTypeId, year, allocated }),
    onSuccess: () => {
      toast("success", "Leave balance allocated.");
      onClose();
      setEmployeeId("");
      setLeaveTypeId("");
      setAllocated(0);
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      toast("error", msg.includes("already exists") ? "This balance already exists for the employee, leave type and year." : msg);
    },
  });

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (!employeeId) next.employeeId = "Select an employee";
    if (!leaveTypeId) next.leaveTypeId = "Select a leave type";
    if (!allocated || allocated <= 0) next.allocated = "Enter a valid allocation";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Allocate leave balance"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            Allocate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Employee</Label>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select an employee</option>
            {employees.data?.items.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} ({e.employeeCode})
              </option>
            ))}
          </Select>
          <FieldError message={errors.employeeId} />
        </div>
        <div>
          <Label>Leave type</Label>
          <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
            <option value="">Select a leave type</option>
            {leaveTypes.data?.map((lt) => (
              <option key={lt._id} value={lt._id}>
                {lt.name} ({lt.annualQuota} days/year)
              </option>
            ))}
          </Select>
          <FieldError message={errors.leaveTypeId} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <Label>Allocated days</Label>
            <Input type="number" min={1} value={allocated} onChange={(e) => setAllocated(Number(e.target.value))} />
            <FieldError message={errors.allocated} />
          </div>
        </div>
      </div>
    </Modal>
  );
}