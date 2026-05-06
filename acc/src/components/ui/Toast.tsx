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
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
  showToastWithUndo: (message: string, onUndo: () => void) => void;
};

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  showToastWithUndo: () => {},
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

  const addToast = useCallback((message: string, type: ToastType, action?: ToastAction, duration = 2500) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type, action }]);
    const t = setTimeout(() => removeToast(id), duration);
    timeouts.current.set(id, t);
  }, [removeToast]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    addToast(message, type);
  }, [addToast]);

  const showToastWithUndo = useCallback((message: string, onUndo: () => void) => {
    addToast(message, "info", { label: "실행취소", onClick: onUndo }, 5000);
  }, [addToast]);

  const iconMap: Record<ToastType, string> = { success: "✓", error: "✕", info: "·" };
  const colorMap: Record<ToastType, string> = {
    success: "var(--accent)",
    error: "#e05050",
    info: "var(--text-sub)",
  };

  return (
    <ToastContext.Provider value={{ showToast, showToastWithUndo }}>
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
          padding: "0 16px 80px",
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
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              animation: toast.exiting ? "toastOut 0.2s ease-in forwards" : "toastIn 0.2s ease-out",
              maxWidth: 320,
              width: "100%",
              pointerEvents: toast.action ? "auto" : "none",
            }}
          >
            <span style={{ color: colorMap[toast.type], fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {iconMap[toast.type]}
            </span>
            <span style={{ color: "var(--text)", fontSize: 13, flex: 1 }}>{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => { toast.action!.onClick(); removeToast(toast.id); }}
                style={{
                  background: "none",
                  border: "1px solid var(--border-light)",
                  borderRadius: 4,
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--accent)",
                  cursor: "pointer",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
