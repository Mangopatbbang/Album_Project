"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openTutorial } from "@/components/ui/TutorialModal";

export default function InquiryFloatingButton() {
  const pathname = usePathname();

  const btnStyle = {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 10px 6px 8px",
    borderRadius: 999,
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    fontSize: 12,
    fontWeight: 500,
    textDecoration: "none",
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    transition: "opacity 0.15s",
    cursor: "pointer",
    fontFamily: "inherit",
  } as const;

  return (
    <div
      style={{ zIndex: 49, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] right-3.5 sm:bottom-6 sm:right-6"
    >
      {/* 가이드 버튼 */}
      <button
        onClick={openTutorial}
        style={btnStyle}
        className="active:opacity-60 hover:opacity-80"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        가이드
      </button>

      {/* 문의 버튼 */}
      {pathname !== "/board" && (
        <Link
          href="/board"
          style={btnStyle}
          className="active:opacity-60 hover:opacity-80"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          문의
        </Link>
      )}
    </div>
  );
}
