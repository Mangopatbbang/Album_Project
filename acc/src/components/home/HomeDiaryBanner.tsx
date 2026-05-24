"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomeDiaryBanner() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <Link
      href="/diary"
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "8px 20px",
        border: "1px solid rgba(196,170,124,0.35)",
        borderRadius: 24,
        backgroundColor: "rgba(196,170,124,0.06)",
        color: "var(--accent)",
        fontSize: 12, fontWeight: 600,
        textDecoration: "none", letterSpacing: "0.02em",
        transition: "background-color 0.15s, border-color 0.15s, transform 0.12s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.backgroundColor = "rgba(196,170,124,0.12)";
        el.style.borderColor = "rgba(196,170,124,0.6)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.backgroundColor = "rgba(196,170,124,0.06)";
        el.style.borderColor = "rgba(196,170,124,0.35)";
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.85 }}>✎</span>
      청음일기
      <span style={{ fontSize: 10, opacity: 0.6 }}>→</span>
    </Link>
  );
}
