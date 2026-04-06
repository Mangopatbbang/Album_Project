"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function MobileLoginHint() {
  const { profile, loading } = useAuth();
  if (loading || profile) return null;

  return (
    <Link
      href="/login"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--accent)",
        fontSize: 13,
        fontWeight: 600,
        border: "1px solid var(--accent)",
        borderRadius: 8,
        padding: "8px 18px",
        textDecoration: "none",
        marginTop: 24,
        transition: "opacity 0.15s",
      }}
      className="sm:hidden active:opacity-60"
    >
      입장하기 →
    </Link>
  );
}
