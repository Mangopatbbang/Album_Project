"use client";

import { useState, useEffect } from "react";
import LogoMark from "@/components/ui/LogoMark";

const G = (a: number) => `rgba(185,152,72,${a})`;

function LogoInDoor({ side }: { side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: side === "left" ? 0 : "-50vw",
        width: "100vw",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ animation: "splashIn 0.9s ease-out forwards", opacity: 0 }}>
        <LogoMark height={64} />
      </div>
      <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.04em", margin: 0, whiteSpace: "nowrap", animation: "splashIn 0.9s ease-out 0.3s forwards", opacity: 0 }}>
        아차청음사
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", margin: 0, whiteSpace: "nowrap", animation: "splashIn 0.9s ease-out 0.65s forwards", opacity: 0 }}>
        청음의 기록
      </p>
    </div>
  );
}


function DoorHandle({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div
      style={{
        position: "absolute",
        ...(isLeft ? { right: 16 } : { left: 16 }),
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 마운팅 플레이트 */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: G(0.07),
          border: `1px solid ${G(0.38)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 12px ${G(0.1)}`,
        }}
      >
        {/* 고리 */}
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `2px solid ${G(0.82)}`,
            boxShadow: `0 0 6px ${G(0.3)}`,
          }}
        />
      </div>
    </div>
  );
}

function TempleDoor({ side, opening }: { side: "left" | "right"; opening: boolean }) {
  const isLeft = side === "left";
  return (
    <div
      style={{
        position: "absolute",
        ...(isLeft ? { left: 0 } : { right: 0 }),
        top: 0,
        width: "50%",
        height: "100%",
        overflow: "hidden",
        transformOrigin: isLeft ? "left center" : "right center",
        animation: opening
          ? `${isLeft ? "doorLeftOpen" : "doorRightOpen"} 2.0s cubic-bezier(0.3,0,0.6,1) forwards`
          : undefined,
        backgroundColor: "#0c0906",
        boxShadow: isLeft
          ? `inset -1px 0 0 ${G(0.55)}, inset 0 1px 0 ${G(0.25)}, inset 0 -1px 0 ${G(0.25)}`
          : `inset 1px 0 0 ${G(0.55)}, inset 0 1px 0 ${G(0.25)}, inset 0 -1px 0 ${G(0.25)}`,
      }}
    >
      <DoorHandle side={side} />
      <LogoInDoor side={isLeft ? "left" : "right"} />
    </div>
  );
}

export default function SplashScreen() {
  const [phase, setPhase] = useState<"loading" | "splash" | "done">("loading");
  const [lineVisible, setLineVisible] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("acc_splash");
    if (!seen) {
      sessionStorage.setItem("acc_splash", "1");
      setPhase("splash");
      setTimeout(() => setLineVisible(true), 1400);
      setTimeout(() => setOpening(true), 2300);
      setTimeout(() => setPhase("done"), 4500);
    } else {
      setPhase("done");
    }
  }, []);

  if (phase === "done") return null;

  // useEffect 실행 전(loading): 문짝 색과 동일한 배경으로 홈화면 노출 차단
  if (phase === "loading") {
    return <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#0c0906" }} />;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        perspective: "900px",
        perspectiveOrigin: "50% 50%",
        pointerEvents: opening ? "none" : "all",
      }}
    >
      <TempleDoor side="left" opening={opening} />
      <TempleDoor side="right" opening={opening} />

      {/* 문이 열릴 때 중앙 빛 번짐 */}
      {opening && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 38% 28% at 50% 50%, ${G(0.13)} 0%, transparent 100%)`,
            animation: "lightBloom 1.4s ease-out forwards",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}

      {/* 중앙 금색 세로선 */}
      {lineVisible && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "calc(50% - 0.5px)",
            width: 1,
            height: "100%",
            backgroundColor: G(0.65),
            transformOrigin: "top center",
            animation: "lineGrow 0.7s cubic-bezier(0.4,0,0.6,1) forwards",
            opacity: opening ? 0 : 1,
            transition: opening ? "opacity 0.15s ease-out" : "none",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
