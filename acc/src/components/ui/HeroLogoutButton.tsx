"use client";

import { useAuth } from "@/context/AuthContext";

export default function HeroLogoutButton() {
  const { profile, loading, signOut } = useAuth();
  if (loading || !profile) return null;

  return (
    <button
      onClick={signOut}
      className="sm:hidden"
      style={{
        width: 80,
        height: 80,
        border: "1px solid var(--border-light)",
        backgroundColor: "var(--bg-card)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1 }}>🚪</span>
      <span style={{ color: "var(--text)", fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" }}>
        로그아웃
      </span>
    </button>
  );
}
