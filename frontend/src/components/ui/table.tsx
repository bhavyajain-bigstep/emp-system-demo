import type { ReactNode, TableHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={cn("bg-surface-50 text-left text-xs uppercase tracking-wide text-surface-500", className)}>
      {children}
    </thead>
  );
}

export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-semibold", className)}>{children}</th>;
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn("divide-y divide-surface-100", className)}>{children}</tbody>;
}

export function TR({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn("transition hover:bg-surface-50/60", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-surface-700", className)}>{children}</td>;
}