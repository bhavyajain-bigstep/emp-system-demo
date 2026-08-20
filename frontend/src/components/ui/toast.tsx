import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="size-5 text-emerald-500" />,
  error: <AlertTriangle className="size-5 text-red-500" />,
  info: <Info className="size-5 text-sky-500" />,
};

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-white",
  error: "border-red-200 bg-white",
  info: "border-sky-200 bg-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++nextId;
      setToasts((prev) => [...prev.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg",
              STYLES[t.kind]
            )}
            role="status"
          >
            {ICONS[t.kind]}
            <p className="flex-1 text-sm font-medium text-surface-800">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-surface-400 transition hover:text-surface-600"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}