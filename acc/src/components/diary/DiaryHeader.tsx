"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDiaryTheme } from "@/components/diary/DiaryThemeProvider";

export default function DiaryHeader() {
  const router = useRouter();
  const { profile } = useAuth();
  const { theme, toggle } = useDiaryTheme();

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else if (profile) router.push(`/profile/${profile.id}`);
    else router.push("/");
  };

  return (
    <>
      {/* 배경 온기 — 고정 레이어 */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 15% 0%, rgba(var(--accent-rgb, 138,45,36), 0.04) 0%, transparent 60%)",
      }} />

      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        backgroundColor: "rgba(var(--bg-rgb, 248,247,244), 0.92)",
      }}>
        <div style={{
          padding: "0 20px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* 돌아가기 — 데스크탑만 */}
          <button
            onClick={handleBack}
            className="hidden sm:flex"
            style={{
              alignItems: "center", gap: 5,
              background: "none", border: "none",
              color: "var(--text-muted)", fontSize: 13,
              cursor: "pointer", padding: "4px 0",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>←</span>
            <span>돌아가기</span>
          </button>
          {/* 모바일 — 빈 공간 확보 */}
          <div className="sm:hidden" style={{ width: 40 }} />

          {/* 타이틀 */}
          <p style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            color: "var(--text)", fontSize: 13, fontWeight: 700,
            letterSpacing: "-0.02em", pointerEvents: "none",
            fontFamily: "var(--font-song, serif)",
          }}>
            청음일기
          </p>

          {/* 오른쪽: 테마 토글 + 私記 뱃지 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={toggle}
              title={theme === "light" ? "다크 모드로" : "라이트 모드로"}
              style={{
                background: "none", border: "1px solid var(--border)",
                padding: "2px 7px", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 11,
                fontFamily: "var(--font-song, serif)",
                letterSpacing: "0.1em",
                transition: "color 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {theme === "light" ? "夜" : "晝"}
            </button>
            <span style={{
              display: "inline-flex",
              border: "1.5px solid var(--accent)",
              padding: "2px 6px",
              fontSize: 9,
              fontWeight: 700,
              color: "var(--accent)",
              letterSpacing: "0.14em",
              opacity: 0.75,
              fontFamily: "var(--font-song, serif)",
            }}>
              私記
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
