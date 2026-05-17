"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { openTutorial } from "@/components/ui/TutorialModal";
import { useAuth } from "@/context/AuthContext";

type Announcement = {
  id: number;
  content: string;
  show_popup: boolean;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function AnnouncementsSheet({
  items,
  onClose,
}: {
  items: Announcement[];
  onClose: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.7)" }}
      className="flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "70dvh",
          backgroundColor: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        className="rounded-t-2xl sm:rounded-2xl"
      >
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 2px 0" }}>NOTICE</p>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>공지사항</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
          {items.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>등록된 공지사항이 없습니다.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: "14px 16px",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: 10,
                    borderLeft: a.show_popup ? "3px solid var(--accent)" : "3px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {a.show_popup && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: "var(--bg)",
                        backgroundColor: "var(--accent)", borderRadius: 3,
                        padding: "2px 5px", letterSpacing: "0.06em",
                      }}>
                        NEW
                      </span>
                    )}
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatDate(a.created_at)}</span>
                  </div>
                  <p style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                    {a.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ height: "calc(env(safe-area-inset-bottom))", flexShrink: 0 }} />
      </div>
    </div>
  );
}

export default function FloatingActions() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showNotices, setShowNotices] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((data: Announcement[]) => {
        setAnnouncements(data);
        setHasNew(data.some((a) => a.show_popup));
      })
      .catch(() => {});
  }, []);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px 7px 10px",
    borderRadius: 999,
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--text-sub)",
    fontSize: 12,
    fontWeight: 500,
    boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
    cursor: "pointer",
    minHeight: 44,
    fontFamily: "inherit",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
    transition: "opacity 0.12s",
  };

  return (
    <>
      <div
        ref={containerRef}
        style={{ zIndex: 49, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] right-3.5 sm:bottom-6 sm:right-6"
      >
        {/* 펼쳐지는 버튼들 */}
        {open && (
          <>
            {/* 어드민 */}
            {profile?.role === "admin" && pathname !== "/admin" && (
              <Link
                href="/admin"
                style={{ ...btnStyle, color: "var(--accent)", borderColor: "rgba(var(--accent-rgb), 0.4)" }}
                onClick={() => setOpen(false)}
                className="active:opacity-60 hover:opacity-80"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  <path d="M18 3l1.5 1.5M21 6l-1.5-1.5" opacity="0.5"/>
                </svg>
                어드민
              </Link>
            )}

            {/* 공지사항 */}
            <button
              onClick={() => { setShowNotices(true); setOpen(false); }}
              style={btnStyle}
              className="active:opacity-60 hover:opacity-80"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
              </svg>
              공지사항
              {hasNew && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "var(--bg)",
                  backgroundColor: "var(--accent)", borderRadius: 3,
                  padding: "1px 4px", letterSpacing: "0.04em", lineHeight: 1.4,
                }}>
                  NEW
                </span>
              )}
            </button>

            {/* 가이드 */}
            <button
              onClick={() => { openTutorial(); setOpen(false); }}
              style={btnStyle}
              className="active:opacity-60 hover:opacity-80"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              가이드
            </button>

            {/* 문의 */}
            {pathname !== "/board" && (
              <Link
                href="/board"
                style={btnStyle}
                onClick={() => setOpen(false)}
                className="active:opacity-60 hover:opacity-80"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                문의
              </Link>
            )}
          </>
        )}

        {/* 메인 토글 버튼 */}
        <button
          data-tour="floating-actions"
          onClick={() => setOpen((v) => !v)}
          style={{
            ...btnStyle,
            padding: "7px 12px",
            position: "relative",
          }}
          className="active:opacity-60 hover:opacity-80"
        >
          {open ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
            </svg>
          )}
          메뉴
          {/* NEW 뱃지 */}
          {!open && hasNew && (
            <span style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "var(--accent)",
              border: "1.5px solid var(--bg)",
            }} />
          )}
        </button>
      </div>

      {showNotices && (
        <AnnouncementsSheet
          items={announcements}
          onClose={() => setShowNotices(false)}
        />
      )}

    </>
  );
}
