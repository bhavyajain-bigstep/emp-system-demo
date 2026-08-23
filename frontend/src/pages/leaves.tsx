import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { Plane, Plus, XCircle } from "lucide-react";

import { leaveApi, leaveTypeApi, leaveBalanceApi } from "@/lib/endpoints";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Label, FieldError } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage, extractErrorCode } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { LeaveRequest } from "@/types";

function leaveTypeLabel(req: LeaveRequest): string {
  const lt = req.leaveTypeId as { name?: string } | string;
  return typeof lt === "string" ? "Time Off" : lt?.name ?? "Time Off";
}

export default function LeavesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  const leaves = useQuery({
    queryKey: ["leaves", "mine"],
    queryFn: leaveApi.listMine,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveApi.cancel(id),
    onSuccess: () => {
      toast("success", "Time off request cancelled.");
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["leaves", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="My Time Off"
        description="Request time off and track the status of your requests."
        actions={
          <Button onClick={() => setApplyOpen(true)}>
            <Plus className="size-4" />
            Request time off
          </Button>
        }
      />

      <Card>
        <CardHeader title="Time off requests" subtitle="All your submitted time off applications" />
        {leaves.isLoading ? (
          <Spinner />
        ) : leaves.isError ? (
          <ErrorState message={leaves.error?.message ?? "Failed to load time off"} onRetry={() => leaves.refetch()} />
        ) : leaves.data?.length === 0 ? (
          <EmptyState
            title="No time off requests yet"
            description="Request time off to see your requests here."
            action={
              <Button onClick={() => setApplyOpen(true)}>
                <Plus className="size-4" />
                Request time off
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Type</TH>
                <TH>From</TH>
                <TH>To</TH>
                <TH>Days</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {leaves.data!.map((leave) => (
                <TR key={leave._id}>
                  <TD className="font-medium text-[var(--text-primary)]">{leaveTypeLabel(leave)}</TD>
                  <TD>{formatDate(leave.fromDate)}</TD>
                  <TD>{formatDate(leave.toDate)}</TD>
                  <TD>{leave.days}</TD>
                  <TD>
                    <StatusBadge status={leave.status} />
                  </TD>
                  <TD className="text-right">
                    {(leave.status === "PENDING" || leave.status === "APPROVED") && (
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => setCancelTarget(leave)}>
                        <XCircle className="size-4" />
                        Cancel
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget._id)}
        title="Cancel time off request"
        message={
          cancelTarget
            ? `Are you sure you want to cancel your ${leaveTypeLabel(cancelTarget)} time off from ${formatDate(
                cancelTarget.fromDate
              )} to ${formatDate(cancelTarget.toDate)}?`
            : ""
        }
        confirmLabel="Cancel request"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}

function ApplyLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const leaveTypes = useQuery({
    queryKey: ["leave-types"],
    queryFn: leaveTypeApi.list,
  });

  const balances = useQuery({
    queryKey: ["leave-balances", "mine"],
    queryFn: () => leaveBalanceApi.listMine(),
  });

  const selectedType = leaveTypes.data?.find((t) => t._id === leaveTypeId);
  const selectedBalance = balances.data?.find((b) => b.leaveTypeId === leaveTypeId);

  const mutation = useMutation({
    mutationFn: () =>
      leaveApi.create({
        leaveTypeId,
        fromDate: parseISO(fromDate).toISOString(),
        toDate: parseISO(toDate).toISOString(),
        reason,
      }),
    onSuccess: () => {
      toast("success", "Time off request submitted for approval.");
      onClose();
      setLeaveTypeId("");
      setFromDate("");
      setToDate("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["leaves", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      const code = extractErrorCode(error);
      if (code === "INSUFFICIENT_LEAVE_BALANCE") toast("error", "Insufficient time off balance for the selected dates.");
      else if (code === "LEAVE_OVERLAP") toast("error", "This request overlaps an existing pending or approved time off.");
      else if (code === "INSUFFICIENT_NOTICE") toast("error", "This time off type requires advance notice.");
      else if (code === "MAX_CONSECUTIVE_DAYS_EXCEEDED") toast("error", "Request exceeds the maximum consecutive days allowed.");
      else toast("error", getErrorMessage(error));
    },
  });

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (!leaveTypeId) next.leaveTypeId = "Select a time off type";
    if (!fromDate) next.fromDate = "Start date is required";
    if (!toDate) next.toDate = "End date is required";
    if (fromDate && toDate && parseISO(toDate) < parseISO(fromDate)) next.toDate = "End date must be after start date";
    if (reason.trim().length < 10) next.reason = "Please provide a reason (at least 10 characters)";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request time off"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            <Plane className="size-4" />
            Submit request
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Time off type</Label>
          <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
            <option value="">Select a time off type</option>
            {leaveTypes.data?.map((lt) => (
              <option key={lt._id} value={lt._id}>
                {lt.name} ({lt.annualQuota} days / year)
              </option>
            ))}
          </Select>
          <FieldError message={errors.leaveTypeId} />
          {selectedType ? (
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-[var(--bg-hover)] p-3 text-xs text-[var(--text-secondary)] sm:grid-cols-3">
              <span>Max consecutive: {selectedType.rules.maxConsecutiveDays} days</span>
              <span>Notice required: {selectedType.rules.minNoticeDays} days</span>
              <span>Weekends excluded: {selectedType.rules.excludeWeekends ? "Yes" : "No"}</span>
              <span>Mandatory holidays excluded: {selectedType.rules.excludeMandatoryHolidays ? "Yes" : "No"}</span>
              <span>Half day: {selectedType.rules.allowHalfDay ? "Allowed" : "Not allowed"}</span>
              <span>
                Available balance: {selectedBalance?.available ?? 0} days
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>From date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <FieldError message={errors.fromDate} />
          </div>
          <div>
            <Label>To date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <FieldError message={errors.toDate} />
          </div>
        </div>

        <div>
          <Label>Reason</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the reason for your time off request..."
          />
          <FieldError message={errors.reason} />
        </div>
      </div>
    </Modal>
  );
}