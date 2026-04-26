"use client";

import { useState, useEffect } from "react";

const SEAM_C = "rgba(185,152,72,0.55)";

/** 로고 콘텐츠 — 문 안에 삽입돼 반쪽씩 찢어짐 */
function LogoInDoor({ side }: { side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        // 왼쪽 문: logo 왼쪽 끝 = 0 (스크린 0), 오른쪽은 door 밖으로 넘쳐 overflow:hidden에 잘림
        // 오른쪽 문: 스크린 왼쪽(0)에서 시작하려면 left = -(door width) = -50vw
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
        // overflow:hidden → 로고 반쪽 클리핑 + perspective는 부모에서 받으므로 door 자체 rotateY는 정상 작동
        overflow: "hidden",
        transformOrigin: isLeft ? "left center" : "right center",
        animation: opening
          ? `${isLeft ? "doorLeftOpen" : "doorRightOpen"} 1.6s cubic-bezier(0.3,0,0.6,1) forwards`
          : undefined,
        backgroundColor: "#0f0b07",
        borderRight: isLeft ? `1px solid ${SEAM_C}` : undefined,
        borderLeft: !isLeft ? `1px solid ${SEAM_C}` : undefined,
      }}
    >
      {/* ── 손잡이 (안쪽 가장자리 중앙) ── */}
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
          zIndex: 2,
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

      {/* ── 로고 반쪽 — 문에 인쇄된 것처럼, 열릴 때 함께 찢어짐 ── */}
      <LogoInDoor side={isLeft ? "left" : "right"} />
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
    // perspective를 부모에 설정 → door 자식의 rotateY가 올바른 원근 투영 적용
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
    </div>
  );
}
