"use client";

import { useEffect, useState } from "react";

type Announcement = { id: number; content: string; show_popup: boolean };

export default function HomePopup() {
  const [text, setText] = useState<string | null>(null);
  const [phase, setPhase] = useState<"in" | "hold" | "out" | "done">("in");

  useEffect(() => {
    if (sessionStorage.getItem("popup_shown")) return;

    fetch("/api/notices")
      .then((r) => r.json())
      .then((list: Announcement[]) => {
        const popup = list.find((a) => a.show_popup);
        if (!popup) return;
        sessionStorage.setItem("popup_shown", "1");
        setText(popup.content);

        // fade-in 600ms → hold 2.8s → fade-out 800ms
        const holdTimer = setTimeout(() => setPhase("out"), 600 + 2800);
        const doneTimer = setTimeout(() => setPhase("done"), 600 + 2800 + 800);
        return () => { clearTimeout(holdTimer); clearTimeout(doneTimer); };
      });
  }, []);

  if (!text || phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        pointerEvents: "none",
        padding: "0 32px",
      }}
    >
      <p
        style={{
          color: "var(--text-sub)",
          fontSize: "clamp(13px, 3vw, 17px)",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.7,
          textAlign: "center",
          maxWidth: 480,
          whiteSpace: "pre-wrap",
          animation: phase === "out"
            ? "popupFadeOut 0.8s ease-in forwards"
            : "popupFadeIn 0.6s ease-out forwards",
        }}
      >
        {text}
      </p>
    </div>
  );
}
