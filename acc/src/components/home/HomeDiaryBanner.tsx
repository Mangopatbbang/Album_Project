"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomeDiaryBanner() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <div
      className="hidden sm:block"
      style={{
        position: "fixed",
        top: 64,
        left: 16,
        zIndex: 40,
      }}
    >
      <Link
        href="/diary"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px",
          border: "1px solid rgba(196,170,124,0.3)",
          borderRadius: 20,
          backgroundColor: "var(--bg-card)",
          color: "var(--text-muted)",
          fontSize: 11, fontWeight: 500,
          textDecoration: "none", letterSpacing: "0.01em",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          transition: "color 0.15s, border-color 0.15s, background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = "var(--accent)";
          el.style.borderColor = "rgba(196,170,124,0.6)";
          el.style.backgroundColor = "rgba(196,170,124,0.08)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLAnchorElement;
          el.style.color = "var(--text-muted)";
          el.style.borderColor = "rgba(196,170,124,0.3)";
          el.style.backgroundColor = "var(--bg-card)";
        }}
      >
        <span style={{ fontSize: 11, lineHeight: 1 }}>✎</span>
        청음일기
      </Link>
    </div>
  );
}
