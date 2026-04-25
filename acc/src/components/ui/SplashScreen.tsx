"use client";

import { useState, useEffect } from "react";

// 절 문 패널 (좌/우 공통)
function TempleDoor({
  side,
  opening,
}: {
  side: "left" | "right";
  opening: boolean;
}) {
  const isLeft = side === "left";
  return (
    <div
      style={{
        position: "absolute",
        ...(isLeft ? { left: 0 } : { right: 0 }),
        top: 0,
        width: "50%",
        height: "100%",
        transformOrigin: isLeft ? "left center" : "right center",
        animation: opening
          ? `${isLeft ? "doorLeftOpen" : "doorRightOpen"} 1.6s cubic-bezier(0.3,0,0.6,1) forwards`
          : undefined,
        // 절 문 배경
        background: "linear-gradient(180deg, #0e0a05 0%, #0b0804 50%, #0e0a05 100%)",
        // 나뭇결 — 수평 미세선
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 48px)",
        borderRight: isLeft ? "1px solid rgba(160,105,35,0.45)" : undefined,
        borderLeft: !isLeft ? "1px solid rgba(160,105,35,0.45)" : undefined,
      }}
    >
      {/* ── 상인방 (위 테두리) ── */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: 12, height: 1,
        backgroundColor: "rgba(160,105,35,0.3)",
      }} />

      {/* ── 살창 영역 (상단 45%) ── */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: 12, height: "44%",
        border: "1px solid rgba(160,105,35,0.3)",
        overflow: "hidden",
      }}>
        {/* 격자살 — 가로 */}
        {[20, 40, 60, 80].map((pct) => (
          <div key={pct} style={{
            position: "absolute", left: 0, right: 0, top: `${pct}%`,
            height: 1, backgroundColor: "rgba(160,105,35,0.22)",
          }} />
        ))}
        {/* 격자살 — 세로 */}
        {[25, 50, 75].map((pct) => (
          <div key={pct} style={{
            position: "absolute", top: 0, bottom: 0, left: `${pct}%`,
            width: 1, backgroundColor: "rgba(160,105,35,0.22)",
          }} />
        ))}
      </div>

      {/* ── 중방 ── */}
      <div style={{
        position: "absolute", left: 12, right: 12, top: "calc(44% + 14px)",
        height: 2, backgroundColor: "rgba(160,105,35,0.35)",
      }} />

      {/* ── 판벽 영역 (하단) ── */}
      <div style={{
        position: "absolute", top: "calc(44% + 20px)", left: 12, right: 12, bottom: 12,
        border: "1px solid rgba(160,105,35,0.25)",
        overflow: "hidden",
      }}>
        {/* 널 이음새 */}
        {[33, 66].map((pct) => (
          <div key={pct} style={{
            position: "absolute", left: 0, right: 0, top: `${pct}%`,
            height: 1, backgroundColor: "rgba(160,105,35,0.15)",
          }} />
        ))}
      </div>

      {/* ── 하인방 (아래 테두리) ── */}
      <div style={{
        position: "absolute", bottom: 12, left: 12, right: 12, height: 1,
        backgroundColor: "rgba(160,105,35,0.3)",
      }} />

      {/* ── 손잡이 (고리) — 안쪽 가장자리 ── */}
      <div style={{
        position: "absolute",
        ...(isLeft ? { right: 18 } : { left: 18 }),
        top: "63%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}>
        {/* 고리 */}
        <div style={{
          width: 14, height: 14,
          borderRadius: "50%",
          border: "2px solid rgba(200,145,50,0.75)",
          boxShadow: "0 0 8px rgba(200,145,50,0.2)",
        }} />
        {/* 고리 받침 */}
        <div style={{
          width: 6, height: 10,
          borderRadius: 2,
          backgroundColor: "rgba(180,125,40,0.5)",
        }} />
      </div>
    </div>
  );
}

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("acc_splash");
    if (!seen) {
      sessionStorage.setItem("acc_splash", "1");
      setShow(true);
      setTimeout(() => setOpening(true), 1600);
      setTimeout(() => setShow(false), 3400);
    }
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      pointerEvents: opening ? "none" : "all",
    }}>
      <TempleDoor side="left" opening={opening} />
      <TempleDoor side="right" opening={opening} />

      {/* 로고 */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 14,
        opacity: opening ? 0 : 1,
        transition: "opacity 0.25s ease-out",
        pointerEvents: "none",
      }}>
        <span style={{ color: "var(--accent)", fontSize: 36, animation: "splashIn 0.9s ease-out forwards", opacity: 0 }}>
          ♪
        </span>
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.04em", animation: "splashIn 0.9s ease-out 0.3s forwards", opacity: 0 }}>
          아차청음사
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", animation: "splashIn 0.9s ease-out 0.65s forwards", opacity: 0 }}>
          청음의 기록
        </p>
      </div>
    </div>
  );
}
