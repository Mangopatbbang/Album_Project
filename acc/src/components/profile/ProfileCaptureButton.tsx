"use client";

import { useRef, useState } from "react";
import { captureElement } from "@/lib/capture";

export default function ProfileCaptureButton({ targetId }: { targetId: string }) {
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
        "✓ 복사됨"
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="8.5" y1="2" x2="8.5" y2="4"/>
          </svg>
          {capturing ? "캡처 중..." : "캡처"}
        </>
      )}
    </button>
  );
}
