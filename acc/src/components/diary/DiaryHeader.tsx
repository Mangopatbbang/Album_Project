"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DiaryHeader() {
  const router = useRouter();
  const { profile } = useAuth();

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
        background: "radial-gradient(ellipse 80% 50% at 15% 0%, rgba(180,140,60,0.05) 0%, transparent 60%)",
      }} />

      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        backgroundColor: "rgba(var(--bg-rgb, 14,14,14), 0.85)",
      }}>
        <div style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* 뒤로가기 */}
          <button
            onClick={handleBack}
            style={{
              display: "flex", alignItems: "center", gap: 5,
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

          {/* 타이틀 */}
          <p style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            color: "var(--text)", fontSize: 13, fontWeight: 700,
            letterSpacing: "-0.02em", pointerEvents: "none",
          }}>
            청음일기
          </p>

          {/* PRIVATE 뱃지 */}
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: "var(--text-muted)", letterSpacing: "0.12em",
            opacity: 0.5,
          }}>
            PRIVATE
          </span>
        </div>
      </header>
    </>
  );
}
