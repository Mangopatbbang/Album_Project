"use client";

import { useState, useEffect } from "react";

const SEAM_C = "rgba(185,152,72,0.6)";

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
      <span
        style={{
          color: "var(--accent)",
          fontSize: 34,
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
          fontSize: 26,
          letterSpacing: "-0.04em",
          margin: 0,
          whiteSpace: "nowrap",
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
          margin: 0,
          whiteSpace: "nowrap",
          animation: "splashIn 0.9s ease-out 0.65s forwards",
          opacity: 0,
        }}
      >
        청음의 기록
      </p>
    </div>
  );
}

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
        overflow: "hidden",
        transformOrigin: isLeft ? "left center" : "right center",
        animation: opening
          ? `${isLeft ? "doorLeftOpen" : "doorRightOpen"} 2.0s cubic-bezier(0.3,0,0.6,1) forwards`
          : undefined,
        backgroundColor: "#0f0b07",
      }}
    >
      {/* 손잡이 */}
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
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "2.5px solid rgba(205,165,65,0.88)",
            boxShadow: "0 0 8px rgba(205,165,65,0.22)",
          }}
        />
        <div
          style={{
            width: 7,
            height: 11,
            borderRadius: 3,
            backgroundColor: "rgba(175,138,55,0.62)",
          }}
        />
      </div>

      <LogoInDoor side={isLeft ? "left" : "right"} />
    </div>
  );
}

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [lineVisible, setLineVisible] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("acc_splash");
    if (!seen) {
      sessionStorage.setItem("acc_splash", "1");
      setShow(true);
      setTimeout(() => setLineVisible(true), 1400); // 선 그어지기 시작
      setTimeout(() => setOpening(true), 2300);      // 선 다 그어진 후 갈라짐
      setTimeout(() => setShow(false), 4500);
    }
  }, []);

  if (!show) return null;

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
      <TempleDoor side="left"  opening={opening} />
      <TempleDoor side="right" opening={opening} />

      {/* 중앙 선: 위→아래로 그어지다가 문이 열리면 페이드아웃 */}
      {lineVisible && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "calc(50% - 0.5px)",
            width: 1,
            height: "100%",
            backgroundColor: SEAM_C,
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
