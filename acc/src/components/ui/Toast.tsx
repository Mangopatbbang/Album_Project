"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";

type ToastAction = { label: string; onClick: () => void };

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
  exiting?: boolean;
  hasProgress?: boolean;
  duration?: number;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
  showToastWithUndo: (message: string, onUndo: () => void) => void;
  showToastWithAction: (message: string, actionLabel: string, onAction: () => void) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  showToastWithUndo: () => {},
  showToastWithAction: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    const t = timeouts.current.get(id);
    if (t) { clearTimeout(t); timeouts.current.delete(id); }
    setToasts((prev) => prev.map((item) => item.id === id ? { ...item, exiting: true } : item));
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 220);
  }, []);

  const addToast = useCallback((message: string, type: ToastType, action?: ToastAction, duration = 2500, hasProgress = false) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type, action, hasProgress, duration }]);
    const t = setTimeout(() => removeToast(id), duration);
    timeouts.current.set(id, t);
  }, [removeToast]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    addToast(message, type);
  }, [addToast]);

  const showToastWithUndo = useCallback((message: string, onUndo: () => void) => {
    addToast(message, "info", { label: "실행취소", onClick: onUndo }, 5000, true);
  }, [addToast]);

  const showToastWithAction = useCallback((message: string, actionLabel: string, onAction: () => void) => {
    addToast(message, "success", { label: actionLabel, onClick: onAction }, 4000);
  }, [addToast]);

  const iconMap: Record<ToastType, string> = { success: "✓", error: "✕", info: "·" };
  const colorMap: Record<ToastType, string> = {
    success: "var(--accent)",
    error: "#e05050",
    info: "var(--text-sub)",
  };

  return (
    <ToastContext.Provider value={{ showToast, showToastWithUndo, showToastWithAction }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "0 16px calc(80px + env(safe-area-inset-bottom))",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-light)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              animation: toast.exiting ? "toastOut 0.2s ease-in forwards" : "toastIn 0.2s ease-out",
              maxWidth: 320,
              width: "100%",
              pointerEvents: "none",
            }}
          >
            <div style={{ padding: "10px 12px 10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: colorMap[toast.type], fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {iconMap[toast.type]}
              </span>
              <span style={{ color: "var(--text)", fontSize: 13, flex: 1 }}>{toast.message}</span>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
                  style={{
                    background: "rgba(var(--accent-rgb), 0.1)",
                    border: "1px solid rgba(var(--accent-rgb), 0.25)",
                    borderRadius: 6,
                    padding: "0 12px",
                    height: 32,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent)",
                    cursor: "pointer",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    pointerEvents: "auto",
                    transition: "background-color 0.15s, opacity 0.15s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(var(--accent-rgb), 0.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(var(--accent-rgb), 0.1)")}
                  onMouseDown={(e) => (e.currentTarget.style.opacity = "0.7")}
                  onMouseUp={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            {toast.hasProgress && !toast.exiting && (
              <div style={{ height: 2, backgroundColor: "var(--border)" }}>
                <div style={{
                  height: "100%",
                  backgroundColor: "var(--accent)",
                  transformOrigin: "left",
                  animation: `toastProgress ${toast.duration ?? 5000}ms linear forwards`,
                }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
