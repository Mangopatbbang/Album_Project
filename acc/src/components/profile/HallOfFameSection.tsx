"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import { glowShadow, glowBorder } from "@/lib/score";

type HallAlbum = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  genre: string | null;
  cover_url: string | null;
  score: number;
};

const INITIAL_LIMIT = 16;

export default function HallOfFameSection({ albums, count, inline }: { albums: HallAlbum[]; count: number; inline?: boolean }) {
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [poppingId, setPoppingId] = useState<string | null>(null);

  const openWithPop = (a: HallAlbum) => {
    setPoppingId(a.id);
    setTimeout(() => setPoppingId(null), 340);
    open(a);
  };

  const open = (a: HallAlbum) => {
    setSelected({ id: a.id, title: a.title, artist: a.artist, artist_display: a.artist_display, genre: a.genre, cover_url: a.cover_url, ratings: [], avg: undefined } as unknown as AlbumWithRatings);
  };

  const visible = showAll ? albums : albums.slice(0, INITIAL_LIMIT);

  // 커버 크기: inline(프로필 명반전) → 72px, 일반 → 64px
  const coverSize = inline ? 72 : 64;

  const grid = (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: inline ? 10 : 8 }}>
        {visible.map((a) => (
          <button
            key={a.id}
            onClick={() => openWithPop(a)}
            title={`${a.title} — ${a.artist_display ?? a.artist}`}
            style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}
            className={poppingId === a.id ? "hof-pop" : "transition-transform active:scale-[0.92]"}
          >
            <div
              style={{
                width: coverSize, height: coverSize, borderRadius: 6, overflow: "hidden",
                backgroundColor: "var(--bg-elevated)", border: `1px solid ${glowBorder(8)}`,
                boxShadow: glowShadow(8),
              }}
              className="transition-opacity hover:opacity-70"
            >
              {a.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 20 }}>♪</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      {count > INITIAL_LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: 12,
            color: "var(--text-muted)",
            fontSize: 11,
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {showAll ? "접기" : `+${count - INITIAL_LIMIT}장 더보기`}
        </button>
      )}
    </>
  );

  if (inline) {
    // 프로필 페이지에서는 래퍼 없이 그리드만 반환 (상위에서 카드 래핑)
    return (
      <>
        {grid}
        {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="profile_hof" />}
      </>
    );
  }

  return (
    <>
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px 28px",
      }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>
          명반전
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>
          8점 · {count}장
        </p>
        {grid}
      </div>
      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} source="profile_hof" />}
    </>
  );
}
