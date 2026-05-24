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
        display: "flex", alignItems: "center", gap: 4,
        color: "var(--text-muted)", fontSize: 11,
        textDecoration: "none", letterSpacing: "0.01em",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)")}
    >
      <span style={{ fontSize: 12, lineHeight: 1 }}>✎</span>
      <span>청음일기</span>
    </Link>
  );
}
