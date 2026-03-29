"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { profile, loading, signOut } = useAuth();

  const navItems = [
    { href: "/albums", label: "음반고" },
    { href: "/best", label: "명반" },
    { href: "/themes", label: "청음집" },
    { href: "/members", label: "청음인" },
    ...(profile ? [{ href: `/profile/${profile.id}`, label: "마이페이지" }] : []),
  ];

  return (
    <header
      style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50"
    >
      <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "180px 1fr 180px", alignItems: "center", height: 52 }}>

        {/* 로고 - 왼쪽 */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--accent)", fontSize: 16, lineHeight: 1 }}>♪</span>
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, letterSpacing: "-0.03em" }}>
            아차청음사
          </span>
        </Link>

        {/* 네비 - 중앙 */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-evenly" }}>
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                color: "var(--text-sub)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                padding: "0 20px",
                height: 52,
                display: "flex",
                alignItems: "center",
                textTransform: "uppercase",
                transition: "color 0.15s, background 0.15s",
              }}
              className="hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 유저 - 오른쪽 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          {!loading && profile && (
            <>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {profile.emoji} {profile.display_name}
              </span>
              <button
                onClick={signOut}
                style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em" }}
                className="hover:text-[var(--text)] transition-colors"
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
