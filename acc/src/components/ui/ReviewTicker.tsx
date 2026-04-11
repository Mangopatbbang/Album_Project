"use client";

import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";

export type TickerItem = {
  user_id: string;
  score: number;
  one_line_review: string;
  album_title: string;
  album_artist: string;
};

export default function ReviewTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  // 아이템이 적으면 여러 번 복제해서 끊김 없이 채우기
  const repeat = Math.max(3, Math.ceil(30 / items.length));
  const track = Array.from({ length: repeat }, () => items).flat();

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
        className="ticker-track"
        style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap", willChange: "transform" }}
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
              {/* 구분점 */}
              <span style={{ color: "var(--border-light)", fontSize: 10, marginRight: -14 }}>◆</span>

              {/* 유저 이모지 + 점수 */}
              {user && (
                <span style={{ flexShrink: 0 }}>
                  <span>{user.emoji}</span>
                  <span style={{ color: scoreColor(item.score), fontWeight: 700, marginLeft: 2 }}>
                    {item.score}
                  </span>
                </span>
              )}

              {/* 앨범명 */}
              <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                {item.album_title}
              </span>

              {/* 한줄 평 */}
              <span style={{ color: "var(--text-sub)", fontStyle: "italic", flexShrink: 0 }}>
                &ldquo;{item.one_line_review}&rdquo;
              </span>
            </span>
          );
        })}
      </div>

      <style>{`
        .ticker-track {
          animation: ticker-scroll 60s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
