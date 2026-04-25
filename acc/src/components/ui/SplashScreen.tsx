"use client";

import { useState, useEffect } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("acc_splash");
    if (!seen) {
      sessionStorage.setItem("acc_splash", "1");
      setShow(true);
      // 1.6초 후 문 열기 시작
      setTimeout(() => setOpening(true), 1600);
      // 애니메이션 끝나면 DOM에서 제거
      setTimeout(() => setShow(false), 3400);
    }
  }, []);

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: opening ? "none" : "all" }}>
      {/* 왼쪽 문 — 왼쪽 경첩으로 안으로 열림 */}
      <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%", perspective: "900px", overflow: "hidden" }}>
        <div
          style={{
            width: "100%", height: "100%",
            backgroundColor: "var(--bg)",
            borderRight: "1px solid var(--border)",
            transformOrigin: "left center",
            animation: opening ? "doorLeftOpen 1.6s cubic-bezier(0.3,0,0.7,1) forwards" : undefined,
          }}
        />
      </div>
      {/* 오른쪽 문 — 오른쪽 경첩으로 안으로 열림 */}
      <div style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%", perspective: "900px", overflow: "hidden" }}>
        <div
          style={{
            width: "100%", height: "100%",
            backgroundColor: "var(--bg)",
            borderLeft: "1px solid var(--border)",
            transformOrigin: "right center",
            animation: opening ? "doorRightOpen 1.6s cubic-bezier(0.3,0,0.7,1) forwards" : undefined,
          }}
        />
      </div>
      {/* 로고 — 문 위에 겹쳐서 표시, 문 열릴 때 페이드아웃 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          opacity: opening ? 0 : 1,
          transition: "opacity 0.25s ease-out",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            color: "var(--accent)",
            fontSize: 36,
            animation: "splashIn 0.9s ease-out forwards",
            opacity: 0,
          }}
        >
          ♪
        </span>
        <p
          style={{
            color: "var(--text)",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "-0.04em",
            animation: "splashIn 0.9s ease-out 0.3s forwards",
            opacity: 0,
          }}
        >
          아차청음사
        </p>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            animation: "splashIn 0.9s ease-out 0.65s forwards",
            opacity: 0,
          }}
        >
          청음의 기록
        </p>
      </div>
    </div>
  );
}
