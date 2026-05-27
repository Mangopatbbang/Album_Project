"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type Props = { userId: string };

export default function ProfileDiaryButton({ userId }: Props) {
  const { profile } = useAuth();
  if (!profile || profile.id !== userId) return null;

  return (
    <Link
      href="/diary"
      data-tour="profile-diary-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "4px 10px",
        color: "var(--text)",
        fontSize: 11,
        textDecoration: "none",
        flexShrink: 0,
        transition: "color 0.15s, border-color 0.15s",
      }}
      className="hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      📖 청음일기
    </Link>
  );
}
