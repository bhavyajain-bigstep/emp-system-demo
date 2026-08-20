import type { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-surface-500">
      <Loader2 className="size-6 animate-spin text-primary-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary-600" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-100">
        <Inbox className="size-6 text-surface-400" />
      </div>
      <p className="text-sm font-semibold text-surface-700">{title}</p>
      {description ? <p className="max-w-sm text-sm text-surface-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-sm font-medium text-red-600">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="text-sm font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}