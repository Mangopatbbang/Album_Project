"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function InquiryFloatingButton() {
  const pathname = usePathname();
  if (pathname === "/board") return null;

  return (
    <Link
      href="/board"
      style={{
        position: "fixed",
        bottom: "calc(72px + env(safe-area-inset-bottom) + 12px)",
        right: 14,
        zIndex: 49,
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
      }}
      className="sm:bottom-6 sm:right-6 active:opacity-60 hover:opacity-80"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      문의
    </Link>
  );
}
