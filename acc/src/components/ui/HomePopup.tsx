"use client";

import { useEffect, useRef, useState } from "react";

type Announcement = { id: number; content: string; show_popup: boolean };
type PopupItem = { content: string; top: string; left: string };

export default function HomePopup() {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [visible, setVisible] = useState(false);
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
        const showList = list.filter((a) => a.show_popup).slice(0, 3);
        if (showList.length === 0) return;
        sessionStorage.setItem("popup_shown", "1");

        // 겹치지 않도록 위치 분산 (3구역)
        const zones = [
          { topRange: [12, 30], leftRange: [5, 30] },
          { topRange: [35, 55], leftRange: [40, 65] },
          { topRange: [15, 35], leftRange: [55, 75] },
        ];
        const items: PopupItem[] = showList.map((a, i) => {
          const z = zones[i % zones.length];
          const top = `${z.topRange[0] + Math.random() * (z.topRange[1] - z.topRange[0])}vh`;
          const left = `${z.leftRange[0] + Math.random() * (z.leftRange[1] - z.leftRange[0])}vw`;
          return { content: a.content, top, left };
        });

        setPopups(items);
        setVisible(true);

        const autoHide = setTimeout(() => setVisible(false), 5000);
        timersRef.current = [autoHide];
      });

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

  if (!visible || popups.length === 0) return null;

  return (
    <>
      {popups.map((popup, idx) => (
        <div
          key={idx}
          style={{
            position: "fixed",
            top: popup.top,
            left: popup.left,
            zIndex: 200,
            pointerEvents: "none",
            backgroundColor: "rgba(20,18,16,0.97)",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            padding: "16px 22px",
            maxWidth: 300,
            minWidth: 200,
            boxShadow: "0 0 20px rgba(232,213,163,0.18), 0 4px 24px rgba(0,0,0,0.6)",
            animation: "popupBlink 5s ease forwards",
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
            {popup.content}
          </p>
        </div>
      ))}
    </>
  );
}
