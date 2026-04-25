"use client";

import { useEffect, useState } from "react";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import UserAvatar from "@/components/ui/UserAvatar";

export type TickerItem = {
  user_id: string;
  score: number;
  one_line_review: string;
  album_id: string;
  album_title: string;
  album_artist: string;
  album_artist_display?: string;
  album_cover_url?: string | null;
  avatar_url?: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewTicker({ items, inline }: { items: TickerItem[]; inline?: boolean }) {
  const [shuffled, setShuffled] = useState(items);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  useEffect(() => {
    setShuffled(shuffle(items));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) return null;

  const repeat = Math.max(2, Math.ceil(12 / shuffled.length));
  const track = Array.from({ length: repeat }, () => shuffled).flat();
  const duration = Math.min(200, Math.max(30, shuffled.length * 5.5));

  const openAlbum = (item: TickerItem) => {
    setSelectedAlbum({
      id: item.album_id,
      title: item.album_title,
      artist: item.album_artist,
      cover_url: item.album_cover_url ?? undefined,
      ratings: [],
    });
  };

  return (
    <>
      <div
        style={inline ? {
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          height: 36,
          display: "flex",
          alignItems: "center",
          position: "relative",
          flex: 1,
          minWidth: 0,
        } : {
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

        {/* 마퀴 트랙 */}
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
                onClick={() => openAlbum(item)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 28px",
                  fontSize: 12,
                  color: "var(--text-sub)",
                  flexShrink: 0,
                  cursor: "pointer",
                  zIndex: 2,
                  position: "relative",
                }}
                className="ticker-item"
              >
                <span style={{ color: "var(--border-light)", fontSize: 10, marginRight: -14 }}>◆</span>

                {user && (
                  <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <UserAvatar avatarUrl={item.avatar_url} size={16} />
                    <span style={{ color: scoreColor(item.score), fontWeight: 700 }}>
                      {item.score}
                    </span>
                  </span>
                )}

                <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                  {item.album_title}
                </span>

                <span style={{ color: "var(--text-muted)", opacity: 0.6, flexShrink: 0, fontSize: 11 }}>
                  {item.album_artist_display ?? item.album_artist}
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
          .ticker-item:hover .ticker-item-title { text-decoration: underline; }
          @keyframes ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />
      )}
    </>
  );
}
