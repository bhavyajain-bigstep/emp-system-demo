import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Building2, Plus, Users } from "lucide-react";

import { departmentApi, employeeApi } from "@/lib/endpoints";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/field";
import { Table, THead, TH, TBody, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage } from "@/lib/api";
import type { Department } from "@/types";

export default function DepartmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Department | null>(null);

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  const managers = useQuery({
    queryKey: ["employees", "managers"],
    queryFn: () => employeeApi.list({ limit: 500, role: "MANAGER" }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => departmentApi.remove(id),
    onSuccess: () => {
      toast("success", "Department archived.");
      setArchiveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  const managerName = (id?: string) => managers.data?.items.find((m) => m._id === id)?.name;

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organize your workforce into departments and assign managers."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            New department
          </Button>
        }
      />

      <Card>
        <CardBody>
          {departments.isLoading ? (
            <Spinner />
          ) : departments.isError ? (
            <ErrorState message={departments.error?.message ?? "Failed to load"} onRetry={() => departments.refetch()} />
          ) : departments.data?.items.length === 0 ? (
            <EmptyState title="No departments yet" description="Create your first department to get started." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Department</TH>
                  <TH>Manager</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {departments.data!.items.map((d) => (
                  <TR key={d._id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                          <Building2 className="size-4" />
                        </div>
                        <p className="font-medium text-surface-900">{d.name}</p>
                      </div>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-1.5 text-surface-600">
                        <Users className="size-4 text-surface-400" />
                        {managerName(d.managerId) ?? "No manager"}
                      </span>
                    </TD>
                    <TD>
                      <Badge className={d.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-surface-100 text-surface-500 ring-surface-200"}>
                        {d.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(d)}>
                          Edit
                        </Button>
                        {d.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setArchiveTarget(d)}
                          >
                            <Archive className="size-4" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <DepartmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        managers={managers.data?.items ?? []}
      />
      <DepartmentFormModal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        department={editTarget}
        managers={managers.data?.items ?? []}
      />
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget._id)}
        title="Archive department"
        message={
          archiveTarget
            ? `Archiving "${archiveTarget.name}" will hide it from new assignments. Existing employees keep their department.`
            : ""
        }
        confirmLabel="Archive department"
        loading={archiveMutation.isPending}
      />
    </div>
  );
}

function DepartmentFormModal({
  open,
  onClose,
  department,
  managers,
}: {
  open: boolean;
  onClose: () => void;
  department?: Department | null;
  managers: { _id: string; name: string }[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(department);

  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const key = department?._id ?? "create";
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (key !== lastKey) {
    setLastKey(key);
    setName(department?.name ?? "");
    setManagerId(department?.managerId ?? "");
    setErrors({});
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, managerId: managerId || undefined };
      return isEdit ? departmentApi.update(department!._id, payload) : departmentApi.create(payload);
    },
    onSuccess: () => {
      toast("success", isEdit ? "Department updated." : "Department created.");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Department name is required (min 2 characters)";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit department" : "New department"}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {isEdit ? "Save changes" : "Create department"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Department name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" />
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label>Department manager</Label>
          <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">No manager</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-surface-500">Managers can approve leave requests for this department's employees.</p>
        </div>
      </div>
    </Modal>
  );
}