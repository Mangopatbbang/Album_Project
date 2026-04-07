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

        // 화면 안쪽 랜덤 위치 (박스 크기 ~280x80 고려)
        const top = `${10 + Math.random() * 55}vh`;
        const left = `${8 + Math.random() * 52}vw`;
        setPos({ top, left });
        setText(popup.content);
        setVisible(true);

        // 3번 깜빡이고 (~3.6s) 자동 숨김
        const autoHide = setTimeout(() => setVisible(false), 3600);
        timersRef.current = [autoHide];
      });

    // 어떤 상호작용이든 즉시 닫기
    const events = ["click", "touchstart", "keydown", "wheel"] as const;
    events.forEach((ev) => document.addEventListener(ev, dismiss, { once: true, passive: true }));

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
        backgroundColor: "rgba(36,34,32,0.88)",
        border: "1px solid var(--border-light)",
        borderRadius: 8,
        padding: "13px 18px",
        maxWidth: 280,
        minWidth: 180,
        animation: "popupBlink 3.6s ease forwards",
      }}
    >
      <p
        style={{
          color: "var(--text-sub)",
          fontSize: 13,
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
