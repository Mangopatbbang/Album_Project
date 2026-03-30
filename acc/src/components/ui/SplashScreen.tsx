"use client";

import { useState, useEffect } from "react";

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("acc_splash");
    if (!seen) {
      sessionStorage.setItem("acc_splash", "1");
      setShow(true);
      setTimeout(() => setFading(true), 2000);
      setTimeout(() => setShow(false), 2700);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "var(--bg)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.7s ease-out",
        pointerEvents: fading ? "none" : "all",
      }}
    >
      <span
        style={{
          color: "var(--accent)",
          fontSize: 36,
          animation: "splashIn 1s ease-out forwards",
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
          animation: "splashIn 1s ease-out 0.35s forwards",
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
          animation: "splashIn 1s ease-out 0.75s forwards",
          opacity: 0,
        }}
      >
        청음의 기록
      </p>
    </div>
  );
}
