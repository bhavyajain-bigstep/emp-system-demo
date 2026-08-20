import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Settings2 } from "lucide-react";

import { leaveTypeApi } from "@/lib/endpoints";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage } from "@/lib/api";
import type { LeaveType } from "@/types";

interface RulesState {
  allowNegativeBalance: boolean;
  excludeWeekends: boolean;
  excludeMandatoryHolidays: boolean;
  allowHalfDay: boolean;
  allowCancellation: boolean;
  maxConsecutiveDays: number;
  minNoticeDays: number;
}

const DEFAULT_RULES: RulesState = {
  allowNegativeBalance: false,
  excludeWeekends: true,
  excludeMandatoryHolidays: true,
  allowHalfDay: true,
  allowCancellation: true,
  maxConsecutiveDays: 5,
  minNoticeDays: 0,
};

function RuleToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start justify-between gap-4 rounded-lg border border-surface-200 bg-white px-4 py-3 text-left transition hover:border-primary-200 hover:bg-primary-50/40"
    >
      <span>
        <span className="block text-sm font-medium text-surface-900">{label}</span>
        <span className="block text-xs text-surface-500">{hint}</span>
      </span>
      <span
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          checked ? "bg-primary-600" : "bg-surface-300"
        }`}
      >
        <span
          className={`inline-block size-4 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export default function LeaveTypesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);

  const leaveTypes = useQuery({
    queryKey: ["leave-types"],
    queryFn: leaveTypeApi.list,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => leaveTypeApi.update(id, { status }),
    onSuccess: () => {
      toast("success", "Leave type status updated.");
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Leave Types"
        description="Define the leave categories and their policies."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New leave type
          </Button>
        }
      />

      <Card>
        <CardBody>
          {leaveTypes.isLoading ? (
            <Spinner />
          ) : leaveTypes.isError ? (
            <ErrorState message={leaveTypes.error?.message ?? "Failed to load"} onRetry={() => leaveTypes.refetch()} />
          ) : leaveTypes.data?.length === 0 ? (
            <EmptyState title="No leave types" description="Create leave types so employees can start requesting leave." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Leave type</TH>
                  <TH>Code</TH>
                  <TH>Annual quota</TH>
                  <TH>Policy</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {leaveTypes.data!.map((lt) => (
                  <TR key={lt._id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                          <CalendarDays className="size-4" />
                        </div>
                        <p className="font-medium text-surface-900">{lt.name}</p>
                      </div>
                    </TD>
                    <TD>
                      <Badge className="bg-surface-100 font-mono text-surface-600 ring-surface-200">{lt.code}</Badge>
                    </TD>
                    <TD className="font-semibold text-surface-900">{lt.annualQuota} days</TD>
                    <TD className="text-xs text-surface-500">
                      <p>
                        Max {lt.rules.maxConsecutiveDays} days · {lt.rules.minNoticeDays}-day notice
                      </p>
                      <p>
                        {lt.rules.excludeWeekends ? "Excludes weekends" : "Counts weekends"} ·{" "}
                        {lt.rules.allowHalfDay ? "Half-days allowed" : "Full days only"}
                      </p>
                    </TD>
                    <TD>
                      <Badge className={lt.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-surface-100 text-surface-500 ring-surface-200"}>
                        {lt.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(lt)}>
                          <Settings2 className="size-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={lt.status === "ACTIVE" ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"}
                          onClick={() => statusMutation.mutate({ id: lt._id, status: lt.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                        >
                          {lt.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <LeaveTypeFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <LeaveTypeFormModal open={Boolean(editTarget)} onClose={() => setEditTarget(null)} leaveType={editTarget} />
    </div>
  );
}

function LeaveTypeFormModal({
  open,
  onClose,
  leaveType,
}: {
  open: boolean;
  onClose: () => void;
  leaveType?: LeaveType | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(leaveType);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [annualQuota, setAnnualQuota] = useState(10);
  const [rules, setRules] = useState<RulesState>(DEFAULT_RULES);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const key = leaveType?._id ?? "create";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (key !== lastKey) {
    setLastKey(key);
    setName(leaveType?.name ?? "");
    setCode(leaveType?.code ?? "");
    setAnnualQuota(leaveType?.annualQuota ?? 10);
    setRules({
      allowNegativeBalance: leaveType?.rules.allowNegativeBalance ?? DEFAULT_RULES.allowNegativeBalance,
      excludeWeekends: leaveType?.rules.excludeWeekends ?? DEFAULT_RULES.excludeWeekends,
      excludeMandatoryHolidays: leaveType?.rules.excludeMandatoryHolidays ?? DEFAULT_RULES.excludeMandatoryHolidays,
      allowHalfDay: leaveType?.rules.allowHalfDay ?? DEFAULT_RULES.allowHalfDay,
      allowCancellation: leaveType?.rules.allowCancellation ?? DEFAULT_RULES.allowCancellation,
      maxConsecutiveDays: leaveType?.rules.maxConsecutiveDays ?? DEFAULT_RULES.maxConsecutiveDays,
      minNoticeDays: leaveType?.rules.minNoticeDays ?? DEFAULT_RULES.minNoticeDays,
    });
    setErrors({});
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        code,
        annualQuota,
        rules,
      };
      return isEdit ? leaveTypeApi.update(leaveType!._id, payload) : leaveTypeApi.create(payload);
    },
    onSuccess: () => {
      toast("success", isEdit ? "Leave type updated." : "Leave type created.");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      if (msg.includes("exists")) toast("error", "A leave type with this code already exists.");
      else toast("error", msg);
    },
  });

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Name is required";
    if (!code.trim() || !/^[A-Za-z0-9_-]{2,20}$/.test(code)) next.code = "Code must be 2-20 letters, numbers, hyphens or underscores";
    if (annualQuota < 0) next.annualQuota = "Annual quota must be 0 or more";
    if (rules.maxConsecutiveDays < 1) next.maxConsecutiveDays = "At least 1 day";
    if (rules.minNoticeDays < 0) next.minNoticeDays = "Cannot be negative";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  const setRule = <K extends keyof RulesState>(key: K, value: RulesState[K]) => setRules((r) => ({ ...r, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit leave type" : "New leave type"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {isEdit ? "Save changes" : "Create leave type"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual Leave" />
            <FieldError message={errors.name} />
          </div>
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ANNUAL" />
            <FieldError message={errors.code} />
          </div>
          <div>
            <Label>Annual quota (days)</Label>
            <Input type="number" min={0} value={annualQuota} onChange={(e) => setAnnualQuota(Number(e.target.value))} />
            <FieldError message={errors.annualQuota} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-surface-900">Policies</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RuleToggle
              label="Exclude weekends"
              hint="Weekend days are not counted when calculating duration"
              checked={rules.excludeWeekends}
              onChange={(v) => setRule("excludeWeekends", v)}
            />
            <RuleToggle
              label="Exclude mandatory holidays"
              hint="Mandatory public holidays are not counted in the duration"
              checked={rules.excludeMandatoryHolidays}
              onChange={(v) => setRule("excludeMandatoryHolidays", v)}
            />
            <RuleToggle
              label="Allow half-day leave"
              hint="Employees may apply for a single half day"
              checked={rules.allowHalfDay}
              onChange={(v) => setRule("allowHalfDay", v)}
            />
            <RuleToggle
              label="Allow cancellation"
              hint="Employees can cancel an approved request"
              checked={rules.allowCancellation}
              onChange={(v) => setRule("allowCancellation", v)}
            />
            <RuleToggle
              label="Allow negative balance"
              hint="Permit requests even when the balance would go below zero"
              checked={rules.allowNegativeBalance}
              onChange={(v) => setRule("allowNegativeBalance", v)}
            />
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-surface-200 bg-surface-50/60 px-4 py-3">
              <div>
                <Label>Max consecutive days</Label>
                <Input type="number" min={1} value={rules.maxConsecutiveDays} onChange={(e) => setRule("maxConsecutiveDays", Number(e.target.value))} />
                <FieldError message={errors.maxConsecutiveDays} />
              </div>
              <div>
                <Label>Min notice (days)</Label>
                <Input type="number" min={0} value={rules.minNoticeDays} onChange={(e) => setRule("minNoticeDays", Number(e.target.value))} />
                <FieldError message={errors.minNoticeDays} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}