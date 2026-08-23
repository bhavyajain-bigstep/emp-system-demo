import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "slate" | "green" | "red" | "amber" | "sky" | "violet" | "primary";

const TONES: Record<BadgeTone, string> = {
  slate: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] ring-[var(--border-primary)]",
  green: "bg-[var(--success-bg)] text-[var(--success-text)] ring-[var(--success-border)]",
  red: "bg-[var(--error-bg)] text-[var(--error-text)] ring-[var(--error-border)]",
  amber: "bg-[var(--warning-bg)] text-[var(--warning-text)] ring-[var(--warning-border)]",
  sky: "bg-[var(--info-bg)] text-[var(--info-text)] ring-[var(--info-border)]",
  violet: "bg-lavender-100 text-lavender-700 ring-lavender-200 dark:bg-lavender-900/30 dark:text-lavender-300 dark:ring-lavender-800",
  primary: "bg-[var(--info-bg)] text-[var(--info-text)] ring-[var(--info-border)]",
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