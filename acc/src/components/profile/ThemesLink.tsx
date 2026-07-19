"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function ThemesAllLink({ userId }: { userId: string }) {
  const { profile } = useAuth();
  if (!profile || profile.id !== userId) return null;
  return (
    <Link href="/themes" style={{ color: "var(--text-muted)", fontSize: 11 }} className="hover:text-[var(--accent)] transition-colors">
      전체 →
    </Link>
  );
}

export function ThemesCreateLink({ userId }: { userId: string }) {
  const { profile } = useAuth();
  if (!profile || profile.id !== userId) return null;
  return (
    <Link href="/themes" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
      청음집 만들러 가기 →
    </Link>
  );
}
