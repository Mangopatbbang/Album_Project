"use client";

import { useState, useEffect } from "react";

const FRAME = 14;
const V_LINES = [20, 40, 60, 80];
const H_LINES = Array.from({ length: 13 }, (_, i) =>
  parseFloat(((i + 1) * (100 / 14)).toFixed(2))
);

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
        // backgroundColor 와 backgroundImage 분리해야 background 단축속성이 덮어쓰지 않음
        backgroundColor: "#100c08",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 64px)",
        borderRight: isLeft ? "2px solid rgba(175,112,38,0.6)" : undefined,
        borderLeft: !isLeft ? "2px solid rgba(175,112,38,0.6)" : undefined,
      }}
    >
      {/* ── 프레임 테두리 4면 ── */}
      <div style={{ position: "absolute", top: FRAME, left: FRAME, right: FRAME, height: 2, backgroundColor: "rgba(175,112,38,0.72)" }} />
      <div style={{ position: "absolute", bottom: FRAME, left: FRAME, right: FRAME, height: 2, backgroundColor: "rgba(175,112,38,0.72)" }} />
      <div style={{ position: "absolute", top: FRAME, left: FRAME, bottom: FRAME, width: 2, backgroundColor: "rgba(175,112,38,0.72)" }} />
      <div style={{ position: "absolute", top: FRAME, right: FRAME, bottom: FRAME, width: 2, backgroundColor: "rgba(175,112,38,0.72)" }} />

      {/* ── 살창 전체 격자 ── */}
      <div
        style={{
          position: "absolute",
          top: FRAME + 2,
          left: FRAME + 2,
          right: FRAME + 2,
          bottom: FRAME + 2,
          overflow: "hidden",
        }}
      >
        {/* 가로살 */}
        {H_LINES.map((pct, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${pct}%`,
              height: 2,
              backgroundColor: "rgba(175,112,38,0.44)",
            }}
          />
        ))}
        {/* 세로살 */}
        {V_LINES.map((pct) => (
          <div
            key={pct}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${pct}%`,
              width: 2,
              backgroundColor: "rgba(175,112,38,0.44)",
            }}
          />
        ))}
      </div>

      {/* ── 손잡이 (고리 + 받침) ── */}
      <div
        style={{
          position: "absolute",
          ...(isLeft ? { right: 22 } : { left: 22 }),
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "2.5px solid rgba(200,138,48,0.88)",
            boxShadow: "0 0 10px rgba(200,138,48,0.22)",
          }}
        />
        <div
          style={{
            width: 8,
            height: 12,
            borderRadius: 3,
            backgroundColor: "rgba(175,112,38,0.62)",
          }}
        />
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: opening ? "none" : "all",
      }}
    >
      <TempleDoor side="left" opening={opening} />
      <TempleDoor side="right" opening={opening} />

      {/* 로고 */}
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
