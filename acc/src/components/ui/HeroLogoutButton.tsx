"use client";

import { useAuth } from "@/context/AuthContext";

export default function HeroLogoutButton() {
  const { profile, loading, signOut } = useAuth();
  if (loading || !profile) return null;

  return (
    <button
      onClick={signOut}
      className="sm:hidden active:opacity-60 transition-opacity"
      style={{
        color: "var(--text-muted)",
        fontSize: 11,
        fontWeight: 600,
        background: "none",
        border: "1px solid var(--border-light)",
        borderRadius: 8,
        padding: "5px 11px",
        cursor: "pointer",
        letterSpacing: "0.03em",
      }}
    >
      로그아웃
    </button>
  );
}
