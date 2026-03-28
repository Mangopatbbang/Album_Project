"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { USERS } from "@/types";

export default function Header() {
  const { profile, loading, signOut } = useAuth();

  return (
    <header
      style={{
        backgroundColor: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
      }}
      className="sticky top-0 z-50"
    >
      <div
        style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}
        className="h-14 flex items-center justify-between"
      >
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <span style={{ color: "var(--accent)", fontSize: 18, lineHeight: 1 }}>♪</span>
          <span style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.03em" }} className="text-sm">
            아차청음사
          </span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-2">
          <Link
            href="/albums"
            style={{ color: "var(--text-sub)" }}
            className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] transition-colors"
          >
            앨범
          </Link>

          {/* 멤버 프로필 링크 */}
          <div style={{ display: "flex", gap: 2 }}>
            {USERS.map((u) => (
              <Link
                key={u.id}
                href={`/profile/${u.id}`}
                title={u.display_name}
                style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1 }}
                className="px-1.5 py-1.5 rounded hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] transition-colors"
              >
                {u.emoji}
              </Link>
            ))}
          </div>

          {!loading && (
            <>
              {profile ? (
                // 로그인 상태
                <div className="flex items-center gap-2 ml-2">
                  <Link
                    href={`/profile/${profile.id}`}
                    style={{
                      color: "var(--text-sub)",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg)",
                    }}
                    className="px-2.5 py-1 text-xs rounded-full hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    {profile.emoji} {profile.display_name}
                  </Link>
                  <button
                    onClick={signOut}
                    style={{ color: "var(--text-muted)", fontSize: 12 }}
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                // 비로그인 상태
                <div className="flex items-center gap-2 ml-2">
                  <Link
                    href="/login"
                    style={{ color: "var(--text-sub)" }}
                    className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-elevated)] hover:text-[var(--text)] transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--bg)",
                      fontWeight: 600,
                    }}
                    className="px-3 py-1.5 text-sm rounded hover:opacity-90 transition-opacity"
                  >
                    입문
                  </Link>
                </div>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
