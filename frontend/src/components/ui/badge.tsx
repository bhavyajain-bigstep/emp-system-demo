import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "slate" | "green" | "red" | "amber" | "sky" | "violet" | "primary";

const TONES: Record<BadgeTone, string> = {
  slate: "bg-surface-100 text-surface-700 ring-surface-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  primary: "bg-primary-50 text-primary-700 ring-primary-200",
};

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: "green",
  APPROVED: "green",
  PRESENT: "green",
  INACTIVE: "slate",
  REJECTED: "red",
  ABSENT: "red",
  PENDING: "amber",
  SUSPENDED: "amber",
  LATE: "amber",
  CANCELLED: "slate",
  HALF_DAY: "sky",
  LEAVE: "violet",
  EMPLOYEE: "slate",
  MANAGER: "sky",
  HR: "violet",
  ADMIN: "primary",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "slate"}>{status}</Badge>;
}