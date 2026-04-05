"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { profile, loading, signOut } = useAuth();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const navItems = [
    { href: "/albums", label: "음반고" },
    { href: "/best", label: "도감" },
    { href: "/themes", label: "청음집" },
    { href: "/members", label: "청음인" },
    ...(profile ? [{ href: `/profile/${profile.id}`, label: "청음록" }] : []),
  ];

  return (
    <header
      style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50"
    >
      <div style={{ padding: "0 16px", height: 52 }} className="flex items-center justify-between gap-2">

        {/* 로고 */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ color: "var(--accent)", fontSize: 16, lineHeight: 1 }}>♪</span>
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.03em" }}
            className="hidden sm:inline">
            아차청음사
          </span>
        </Link>

        {/* 네비 - 중앙 (모바일에서 숨김, 하단 탭바로 대체) */}
        <nav className="hidden sm:flex items-center justify-center flex-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => setHoveredNav(href)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                color: hoveredNav === href ? "var(--text)" : "var(--text-sub)",
                backgroundColor: hoveredNav === href ? "var(--border)" : "transparent",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                height: 52,
                display: "flex",
                alignItems: "center",
                textTransform: "uppercase",
                transition: "color 0.15s, background-color 0.15s",
              }}
              className="px-2 sm:px-4 md:px-5"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 유저 - 오른쪽 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!loading && profile && (
            <>
              <Link href={`/profile/${profile.id}`} style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}
                className="hover:text-[var(--text)] transition-colors">
                <span className="sm:hidden">{profile.emoji}</span>
                <span className="hidden sm:inline">{profile.emoji} {profile.display_name}</span>
              </Link>
              <button
                onClick={signOut}
                style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em" }}
                className="hidden sm:block hover:text-[var(--text)] transition-colors"
              >
                로그아웃
              </button>
            </>
          )}
          {!loading && !profile && (
            <Link href="/login" style={{ color: "var(--text-muted)", fontSize: 12 }}
              className="hover:text-[var(--text)] transition-colors">
              입장
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
