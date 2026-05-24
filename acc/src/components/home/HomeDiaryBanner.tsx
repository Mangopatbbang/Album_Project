"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomeDiaryBanner() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <Link href="/diary" style={{ textDecoration: "none", display: "block", marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px",
        backgroundColor: "rgba(var(--accent-rgb), 0.05)",
        border: "1px solid rgba(var(--accent-rgb), 0.15)",
        borderRadius: 10,
        transition: "border-color 0.15s, background-color 0.15s",
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(var(--accent-rgb), 0.09)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(var(--accent-rgb), 0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(var(--accent-rgb), 0.05)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(var(--accent-rgb), 0.15)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, color: "var(--accent)", lineHeight: 1, opacity: 0.85 }}>✎</span>
          <div>
            <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.02em" }}>
              청음일기
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1 }}>
              나의 청취 기록
            </p>
          </div>
        </div>
        <span style={{ color: "var(--accent)", fontSize: 13, opacity: 0.7 }}>→</span>
      </div>
    </Link>
  );
}
