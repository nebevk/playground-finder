"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const ALERT_CLASS = {
  success: "alert-success",
  error: "alert-error",
  info: "alert-info",
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const tCommon = useTranslations("common");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", durationMs = 4000) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast toast-center toast-bottom z-[2000] mb-[env(safe-area-inset-bottom)] w-full max-w-md px-4 md:mb-0">
        {toasts.map((t) => {
          const Icon = ICON[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`alert ${ALERT_CLASS[t.type]} shadow-lg animate-in fade-in slide-in-from-bottom-2`}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="text-sm font-medium">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label={tCommon("close")}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
