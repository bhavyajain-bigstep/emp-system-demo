import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarDays, Plus, Sparkles, Trash2 } from "lucide-react";

import { holidayApi } from "@/lib/endpoints";
import { useAuth } from "@/context/auth";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/data-display";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Spinner, ErrorState, EmptyState } from "@/components/ui/feedback";
import { getErrorMessage } from "@/lib/api";
import type { Holiday } from "@/types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function HolidaysPage() {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const year = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const canManage = hasRole("HR", "ADMIN");

  const holidays = useQuery({
    queryKey: ["holidays", year],
    queryFn: () => holidayApi.list({ year }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => holidayApi.remove(id),
    onSuccess: () => {
      toast("success", "Holiday removed.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  const byMonth = useMemo(() => {
    const map = new Map<number, Holiday[]>();
    for (const h of holidays.data ?? []) {
      const m = Number(format(parseISO(h.date), "M"));
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(h);
    }
    return map;
  }, [holidays.data]);

  const months = filterMonth ? [filterMonth] : MONTHS;

  return (
    <div>
      <PageHeader
        title="Holidays"
        description={`Company holiday calendar for ${year}.`}
        actions={
          canManage ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add holiday
           </Button>
          ) : undefined
        }
      />

      <Card>
        <CardBody>
          <div className="mb-5 flex items-center justify-between">
            <Select className="w-48" value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}>
              <option value={0}>All months</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {format(new Date(year, m - 1, 1), "MMMM")}
                </option>
              ))}
            </Select>
            <p className="text-sm text-surface-500">
              {holidays.data?.length ?? 0} holiday{(holidays.data?.length ?? 0) === 1 ? "" : "s"} in {year}
            </p>
          </div>

          {holidays.isLoading ? (
            <Spinner />
          ) : holidays.isError ? (
            <ErrorState message={holidays.error?.message ?? "Failed to load"} onRetry={() => holidays.refetch()} />
          ) : holidays.data?.length === 0 ? (
            <EmptyState title="No holidays scheduled" description="Add holidays so leave requests can exclude them automatically." />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {months.map((m) => {
                const items = byMonth.get(m);
                if (!items || items.length === 0) {
                  return (
                    <div key={m} className="rounded-xl border border-dashed border-surface-200 p-4">
                      <p className="text-sm font-semibold text-surface-900">{format(new Date(year, m - 1, 1), "MMMM")}</p>
                      <p className="mt-1 text-xs text-surface-400">No holidays</p>
                    </div>
                  );
                }
                return (
                  <div key={m} className="rounded-xl border border-surface-200 bg-surface-50/40 p-4">
                    <p className="mb-3 text-sm font-semibold text-surface-900">{format(new Date(year, m - 1, 1), "MMMM")}</p>
                    <div className="space-y-2">
                      {items
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((h) => (
                          <div
                            key={h._id}
                            className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white px-3 py-2.5"
                          >
                            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                              <span className="text-sm font-bold leading-none">{format(parseISO(h.date), "d")}</span>
                              <span className="text-[10px] uppercase leading-none">{format(parseISO(h.date), "EEE")}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-surface-900">{h.name}</p>
                              <p className="flex items-center gap-1 text-xs text-surface-500">
                                {format(parseISO(h.date), "MMM d, yyyy")}
                                {h.optional && (
                                  <Badge className="bg-sky-50 text-sky-700 ring-sky-200">
                                    <Sparkles className="size-3" />
                                    Optional
                                  </Badge>
                                )}
                              </p>
                            </div>
                            {canManage ? (
                              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(h)}>
                                <Trash2 className="size-4" />
                             </Button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <AddHolidayModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
        title="Remove holiday"
        message={deleteTarget ? `Remove "${deleteTarget.name}" (${format(parseISO(deleteTarget.date), "MMM d, yyyy")}) from the calendar?` : ""}
        confirmLabel="Remove holiday"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function AddHolidayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [optional, setOptional] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => holidayApi.create({ date, name: name.trim(), optional }),
    onSuccess: () => {
      toast("success", "Holiday added to the calendar.");
      onClose();
      setDate("");
      setName("");
      setOptional(false);
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
    onError: (error) => toast("error", getErrorMessage(error)),
  });

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (!date) next.date = "Date is required";
    if (name.trim().length < 2) next.name = "Name is required";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add holiday"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            <CalendarDays className="size-4" />
            Add holiday
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <FieldError message={errors.date} />
        </div>
        <div>
          <Label>Holiday name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Independence Day" />
          <FieldError message={errors.name} />
        </div>
        <RuleToggle label="Optional holiday" hint="Optional holidays are excluded only when the leave type chooses to" checked={optional} onChange={setOptional} />
      </div>
    </Modal>
  );
}

function RuleToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-lg border border-surface-200 bg-white px-4 py-3 text-left transition hover:border-primary-200">
      <span>
        <span className="block text-sm font-medium text-surface-900">{label}</span>
        <span className="block text-xs text-surface-500">{hint}</span>
      </span>
      <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${checked ? "bg-primary-600" : "bg-surface-300"}`}>
        <span className={`inline-block size-4 transform rounded-full bg-white shadow transition ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}