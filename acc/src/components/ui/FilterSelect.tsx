"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export interface FilterOption {
  value: string | number;
  label: string;
}

interface Props {
  value: string | number;
  onChange: (value: string) => void;
  options: FilterOption[];
  title?: string;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function FilterSelect({ value, onChange, options, title, active, className, style }: Props) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const prevOverflow = useRef("");
  const isMobileRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const currentLabel = options.find((o) => String(o.value) === String(value))?.label ?? "선택";
  const isActive = active !== undefined ? active : (String(value) !== "");

  const handleOpen = () => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    isMobileRef.current = mobile;
    if (mobile) {
      prevOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    if (isMobileRef.current) {
      document.body.style.overflow = prevOverflow.current;
    }
  };

  const handleSelect = (v: string) => {
    onChange(v);
    handleClose();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={className}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
          backgroundColor: isActive ? "rgba(var(--accent-rgb), 0.07)" : "var(--bg-elevated)",
          color: isActive ? "var(--accent)" : "var(--text-sub)",
          borderRadius: 6, padding: "5px 10px",
          fontSize: 12, fontWeight: isActive ? 600 : 400,
          cursor: "pointer", whiteSpace: "nowrap",
          transition: "border-color 0.15s, background-color 0.15s, color 0.15s",
          ...style,
        }}
      >
        <span>{currentLabel}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.55, flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {mounted && open && createPortal(
        <>
          <div onClick={handleClose} style={{ position: "fixed", inset: 0, zIndex: 9000, backgroundColor: isMobile ? "rgba(0,0,0,0.55)" : "transparent" }} />

          {isMobile ? (
            <div style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9001,
              backgroundColor: "var(--bg-elevated)",
              borderTop: "1px solid var(--border)",
              borderRadius: "16px 16px 0 0",
              maxHeight: "65vh", overflowY: "auto",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              animation: "sheetIn 0.26s cubic-bezier(0.22, 1, 0.36, 1)",
            }}>
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
              </div>
              {title && (
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", padding: "4px 20px 10px", textTransform: "uppercase", margin: 0 }}>
                  {title}
                </p>
              )}
              {options.map((opt) => {
                const sel = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(String(opt.value))}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "15px 20px",
                      background: sel ? "rgba(var(--accent-rgb), 0.06)" : "none",
                      border: "none", borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      color: sel ? "var(--accent)" : "var(--text)",
                      fontSize: 15, fontWeight: sel ? 700 : 400,
                    }}
                  >
                    {opt.label}
                    {sel && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{
              position: "fixed",
              top: pos.top, left: pos.left,
              minWidth: Math.max(Math.min(pos.width, 260), 160),
              zIndex: 9001,
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-light)",
              borderRadius: 8,
              boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
              overflow: "hidden",
              animation: "fadeIn 0.14s ease-out",
            }}>
              {title && (
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", padding: "8px 12px 4px", textTransform: "uppercase", margin: 0 }}>
                  {title}
                </p>
              )}
              {options.map((opt) => {
                const sel = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(String(opt.value))}
                    className="hover:bg-[var(--bg-card)]"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "9px 12px",
                      background: sel ? "rgba(var(--accent-rgb), 0.07)" : "none",
                      border: "none", borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      color: sel ? "var(--accent)" : "var(--text)",
                      fontSize: 12, fontWeight: sel ? 600 : 400,
                      textAlign: "left",
                    }}
                  >
                    {opt.label}
                    {sel && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
}
