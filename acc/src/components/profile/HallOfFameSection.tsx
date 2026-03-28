"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

type HallAlbum = {
  id: string;
  title: string;
  artist: string;
  year: string | null;
  genre: string | null;
  cover_url: string | null;
  score: number;
};

export default function HallOfFameSection({ albums, count }: { albums: HallAlbum[]; count: number }) {
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);

  const open = (a: HallAlbum) => {
    setSelected({ id: a.id, title: a.title, artist: a.artist, year: a.year, genre: a.genre, cover_url: a.cover_url, ratings: [], avg: undefined } as unknown as AlbumWithRatings);
  };

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {albums.map((a) => (
            <button
              key={a.id}
              onClick={() => open(a)}
              title={`${a.title} — ${a.artist}`}
              style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 6, overflow: "hidden",
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                transition: "opacity 0.15s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
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
      </div>
      {selected && <AlbumModal album={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
