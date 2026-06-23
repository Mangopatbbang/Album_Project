"use client";

import { useState } from "react";
import { captureElement } from "@/lib/capture";

export default function ElementCaptureButton({ targetId }: { targetId: string }) {
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);

  const handleCapture = async () => {
    const el = document.getElementById(targetId);
    if (!el || capturing) return;
    setCapturing(true);
    await captureElement(el);
    setCapturing(false);
    setCaptured(true);
    setTimeout(() => setCaptured(false), 2000);
  };

  return (
    <button
      onClick={handleCapture}
      disabled={capturing}
      title="이미지로 저장"
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "4px 10px",
        cursor: capturing ? "default" : "pointer",
        color: captured ? "var(--accent)" : "var(--text-muted)",
        fontSize: 11,
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "all 0.2s",
        opacity: capturing ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {captured ? (
        "✓ 저장됨"
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          {capturing ? "저장 중..." : "공유"}
        </>
      )}
    </button>
  );
}
