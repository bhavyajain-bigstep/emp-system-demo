import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";

import { leaveApi } from "@/lib/endpoints";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { LeaveRequest } from "@/types";

function employeeLabel(req: LeaveRequest): { name: string; code: string } {
  const emp = req.employeeId as { name?: string; employeeCode?: string } | string;
  if (typeof emp === "string") return { name: "Employee", code: "" };
  return { name: emp?.name ?? "Employee", code: emp?.employeeCode ?? "" };
}

function leaveTypeLabel(req: LeaveRequest): string {
  const lt = req.leaveTypeId as { name?: string } | string;
  return typeof lt === "string" ? "Leave" : lt?.name ?? "Leave";
}

export default function LeaveApprovalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);

  const pending = useQuery({
    queryKey: ["leaves", "pending"],
    queryFn: leaveApi.listPending,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leaves", "pending"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: () => {
      toast("success", "Leave request approved. Balance updated.");
      invalidate();
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveApi.reject(id, reason),
    onSuccess: () => {
      toast("success", "Leave request rejected.");
      setRejectTarget(null);
      invalidate();
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  return (
    <div>
      <PageHeader
        title="Leave Approvals"
        description="Review and respond to pending leave requests from your team."
      />

      <Card>
        <CardHeader title="Pending requests" subtitle="Requests waiting for your decision" />
        {pending.isLoading ? (
          <Spinner />
        ) : pending.isError ? (
          <ErrorState message={pending.error?.message ?? "Failed to load"} onRetry={() => pending.refetch()} />
        ) : pending.data?.length === 0 ? (
          <EmptyState title="No pending requests" description="You're all caught up. No leave requests await approval." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Employee</TH>
                <TH>Leave type</TH>
                <TH>From</TH>
                <TH>To</TH>
                <TH>Days</TH>
                <TH>Reason</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {pending.data!.map((req) => {
                const emp = employeeLabel(req);
                return (
                  <TR key={req._id}>
                    <TD>
                      <p className="font-medium text-surface-900">{emp.name}</p>
                      <p className="text-xs text-surface-500">{emp.code}</p>
                    </TD>
                    <TD>{leaveTypeLabel(req)}</TD>
                    <TD>{formatDate(req.fromDate)}</TD>
                    <TD>{formatDate(req.toDate)}</TD>
                    <TD>{req.days}</TD>
                    <TD className="max-w-56">
                      <p className="truncate text-surface-600" title={req.reason}>
                        {req.reason}
                      </p>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          loading={approveMutation.isPending && approveMutation.variables === req._id}
                          onClick={() => approveMutation.mutate(req._id)}
                        >
                          <Check className="size-4" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setRejectTarget(req)}>
                          <X className="size-4" />
                          Reject
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <RejectModal
        request={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={(reason) => rejectTarget && rejectMutation.mutate({ id: rejectTarget._id, reason })}
        loading={rejectMutation.isPending}
      />
    </div>
  );
}

function RejectModal({
  request,
  onClose,
  onSubmit,
  loading,
}: {
  request: LeaveRequest | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title="Reject leave request"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={reason.trim().length < 5} loading={loading} onClick={() => onSubmit(reason.trim())}>
            Reject request
          </Button>
        </>
      }
    >
      {request ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-50 p-4 text-sm text-surface-600">
            <p>
              <span className="font-semibold text-surface-900">{employeeLabel(request).name}</span> ·{" "}
              {leaveTypeLabel(request)} · {formatDate(request.fromDate)} → {formatDate(request.toDate)} (
              {request.days} day{request.days === 1 ? "" : "s"})
            </p>
            <p className="mt-1">"{request.reason}"</p>
          </div>
          <div>
            <Label>Rejection reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this request is being rejected..." />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}