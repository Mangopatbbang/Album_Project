"use client";

import { useEffect, useRef, useState } from "react";

type Announcement = { id: number; content: string; show_popup: boolean };

export default function HomePopup() {
  const [text, setText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: string; left: string } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = () => {
    setVisible(false);
    timersRef.current.forEach(clearTimeout);
  };

  useEffect(() => {
    if (sessionStorage.getItem("popup_shown")) return;

    fetch("/api/notices")
      .then((r) => r.json())
      .then((list: Announcement[]) => {
        const popup = list.find((a) => a.show_popup);
        if (!popup) return;
        sessionStorage.setItem("popup_shown", "1");

        // 화면 안쪽 랜덤 위치 (박스 ~300x100 고려)
        const top = `${12 + Math.random() * 50}vh`;
        const left = `${6 + Math.random() * 48}vw`;
        setPos({ top, left });
        setText(popup.content);
        setVisible(true);

        // 3번 깜빡 (~3.6s) 후 자동 소멸
        const autoHide = setTimeout(() => setVisible(false), 3800);
        timersRef.current = [autoHide];
      });

    // 어떤 상호작용이든 즉시 닫기
    const events = ["click", "touchstart", "keydown", "wheel"] as const;
    events.forEach((ev) =>
      document.addEventListener(ev, dismiss, { once: true, passive: true })
    );

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, dismiss));
      timersRef.current.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!text || !pos || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 200,
        pointerEvents: "none",
        backgroundColor: "rgba(20,18,16,0.97)",
        border: "1px solid var(--accent)",
        borderRadius: 8,
        padding: "16px 22px",
        maxWidth: 300,
        minWidth: 200,
        boxShadow: "0 0 20px rgba(232,213,163,0.18), 0 4px 24px rgba(0,0,0,0.6)",
        animation: "popupBlink 3.8s ease forwards",
      }}
    >
      <p
        style={{
          color: "var(--accent)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 7,
        }}
      >
        공지
      </p>
      <p
        style={{
          color: "var(--text)",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}
