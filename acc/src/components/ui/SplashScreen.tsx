"use client";

import { useState, useEffect } from "react";
import LogoMark from "@/components/ui/LogoMark";

const G = (a: number) => `rgba(185,152,72,${a})`;
const PLANK_Y = [14, 27, 52, 65, 78, 90] as const;

function DoorSVG({ isLeft }: { isLeft: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        transform: isLeft ? undefined : "scaleX(-1)",
      }}
    >
      <rect width="100" height="100" fill="#130e08" filter="url(#door-grain)" />
      <rect width="100" height="100" fill="url(#door-depth)" />
      <rect width="100" height="100" fill="url(#door-seam)" />
      {PLANK_Y.map((y) => (
        <g key={y}>
          <rect x={0} y={y}        width={100} height={0.35} fill="#000"    opacity={0.30} />
          <rect x={0} y={y + 0.35} width={100} height={0.20} fill="#c8b090" opacity={0.08} />
        </g>
      ))}
      <rect x={0}    y={0} width={0.8} height={100} fill="#000" opacity={0.20} />
      <rect x={99.2} y={0} width={0.8} height={100} fill="#000" opacity={0.12} />
    </svg>
  );
}

function LogoInDoor({ side }: { side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "40%",
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
        backgroundColor: "#130e08",
      }}
    >
      <DoorSVG isLeft={isLeft} />
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
    return <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#130e08" }} />;
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
            opacity: 0,
            transform: "scaleY(0)",
            animation: opening
              ? "lineFade 0.15s ease-out forwards"
              : "lineGrow 0.7s cubic-bezier(0.4,0,0.6,1) forwards",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
