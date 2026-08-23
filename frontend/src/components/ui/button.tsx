import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600 dark:active:bg-primary-700",
  secondary:
    "bg-[var(--bg-tertiary)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] focus-visible:ring-[var(--border-focus)]",
  outline:
    "border border-[var(--border-primary)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] focus-visible:ring-[var(--border-focus)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)] focus-visible:ring-[var(--border-focus)]",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600 dark:active:bg-rose-700",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  )
);

Button.displayName = "Button";