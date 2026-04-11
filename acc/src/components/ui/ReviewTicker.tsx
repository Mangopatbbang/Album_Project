"use client";

import { useEffect, useState } from "react";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";

export type TickerItem = {
  user_id: string;
  score: number;
  one_line_review: string;
  album_title: string;
  album_artist: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewTicker({ items }: { items: TickerItem[] }) {
  // SSR은 원본 순서, 마운트 시 셔플 (hydration mismatch 방지)
  const [shuffled, setShuffled] = useState(items);

  useEffect(() => {
    setShuffled(shuffle(items));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) return null;

  // 화면을 채울 수 있도록 최소한만 반복
  const repeat = Math.max(2, Math.ceil(12 / shuffled.length));
  const track = Array.from({ length: repeat }, () => shuffled).flat();

  // 아이템 하나가 화면을 지나가는 시간 ≈ 3.5초 고정
  // repeat은 시각적 패딩용이므로 duration은 고유 아이템 수 기준으로 계산
  const duration = Math.min(120, Math.max(20, shuffled.length * 3.5));

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--bg-elevated)",
        overflow: "hidden",
        height: 36,
        display: "flex",
        alignItems: "center",
        position: "relative",
        zIndex: 40,
      }}
    >
      {/* 좌우 페이드 마스크 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, var(--bg-elevated) 0%, transparent 80px, transparent calc(100% - 80px), var(--bg-elevated) 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* 마퀴 트랙 — 두 벌 이어붙여서 seamless loop */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          willChange: "transform",
          animation: `ticker-scroll ${duration}s linear infinite`,
        }}
        className="ticker-track"
      >
        {[...track, ...track].map((item, i) => {
          const user = USERS.find((u) => u.id === item.user_id);
          return (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0 28px",
                fontSize: 12,
                color: "var(--text-sub)",
                flexShrink: 0,
              }}
            >
              <span style={{ color: "var(--border-light)", fontSize: 10, marginRight: -14 }}>◆</span>

              {user && (
                <span style={{ flexShrink: 0 }}>
                  <span>{user.emoji}</span>
                  <span style={{ color: scoreColor(item.score), fontWeight: 700, marginLeft: 2 }}>
                    {item.score}
                  </span>
                </span>
              )}

              <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                {item.album_title}
              </span>

              <span style={{ color: "var(--text-sub)", fontStyle: "italic", flexShrink: 0 }}>
                &ldquo;{item.one_line_review}&rdquo;
              </span>
            </span>
          );
        })}
      </div>

      <style>{`
        .ticker-track:hover { animation-play-state: paused; }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
