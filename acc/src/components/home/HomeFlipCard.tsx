"use client";

import { useState } from "react";
import HomeControversialSection, { ControversialItem } from "./HomeControversialSection";
import { useAuth } from "@/context/AuthContext";
import WatchlistSection from "@/components/profile/WatchlistSection";

export default function HomeFlipCard({ items }: { items: ControversialItem[] }) {
  const { profile } = useAuth();
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleFlip = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setFlipped((v) => !v);
      setTimeout(() => setAnimating(false), 160);
    }, 160);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2
          style={{
            color: "#ffffff",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "-0.02em",
            transition: "opacity 0.14s",
            opacity: animating ? 0 : 1,
          }}
        >
          {flipped ? "나중에 들을 앨범" : "갑론을박"}
        </h2>
        <button
          onClick={handleFlip}
          disabled={animating}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 6,
            color: "rgba(255,255,255,0.55)",
            fontSize: 11,
            padding: "3px 9px",
            cursor: animating ? "default" : "pointer",
            letterSpacing: "0.01em",
            transition: "opacity 0.14s, color 0.15s, border-color 0.15s",
            opacity: animating ? 0 : 1,
          }}
          className="hover:!border-white/35 hover:!text-white/80"
        >
          {flipped ? "← 갑론을박" : "나중에 들을 앨범 →"}
        </button>
      </div>

      {/* 콘텐츠 — 뒤집기 애니메이션 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          transition: "transform 0.16s ease, opacity 0.16s ease",
          transform: animating
            ? "perspective(800px) rotateY(88deg)"
            : "perspective(800px) rotateY(0deg)",
          opacity: animating ? 0 : 1,
        }}
      >
        {flipped ? (
          profile ? (
            <WatchlistSection userId={profile.id} />
          ) : (
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "28px 24px",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 6,
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                로그인하면 나중에 들을 앨범을 볼 수 있어요
              </p>
            </div>
          )
        ) : (
          <HomeControversialSection items={items} />
        )}
      </div>
    </div>
  );
}
