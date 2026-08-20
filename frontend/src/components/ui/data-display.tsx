import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "primary" | "green" | "amber" | "red" | "sky" | "violet";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-50 text-primary-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-surface-500">{label}</p>
        {icon ? <div className={cn("flex size-9 items-center justify-center rounded-lg", tones[tone])}>{icon}</div> : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-surface-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-surface-500">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-surface-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-surface-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3">
      <p className="text-xs text-surface-500">
        Page {page} of {totalPages} · {total} records
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-md border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-600 transition hover:bg-surface-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded-md border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-600 transition hover:bg-surface-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}