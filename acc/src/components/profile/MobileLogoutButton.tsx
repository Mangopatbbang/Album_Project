"use client";

import { useAuth } from "@/context/AuthContext";

export default function MobileLogoutButton({ userId }: { userId: string }) {
  const { profile, signOut } = useAuth();

  // 본인 프로필 + 모바일 전용
  if (!profile || profile.id !== userId) return null;

  return (
    <button
      onClick={signOut}
      className="sm:hidden"
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "4px 10px",
        cursor: "pointer",
        color: "var(--text)",
        fontSize: 11,
        flexShrink: 0,
      }}
    >
      로그아웃
    </button>
  );
}
