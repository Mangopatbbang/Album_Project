"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const iconMap: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "·",
  };

  const colorMap: Record<ToastType, string> = {
    success: "var(--accent)",
    error: "#e05050",
    info: "var(--text-sub)",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "0 16px",
          pointerEvents: "none",
        }}
        className="pb-[84px] sm:pb-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: `1px solid var(--border-light)`,
              borderRadius: 10,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              animation: "toastIn 0.2s ease-out",
              maxWidth: 320,
              width: "100%",
            }}
          >
            <span style={{ color: colorMap[toast.type], fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {iconMap[toast.type]}
            </span>
            <span style={{ color: "var(--text)", fontSize: 13 }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
