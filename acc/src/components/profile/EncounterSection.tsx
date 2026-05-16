"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { scoreColor } from "@/lib/score";
import { AlbumWithRatings } from "@/types";

export type EncounterAlbum = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  year: string | null;
  genre: string | null;
  cover_url: string | null;
  score: number;
  encounter_date: string;
};

const INITIAL_LIMIT = 16;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function EncounterSection({ albums }: { albums: EncounterAlbum[] }) {
  const [selected, setSelected] = useState<AlbumWithRatings | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sorted = [...albums].sort((a, b) => b.encounter_date.localeCompare(a.encounter_date));
  const visible = showAll ? sorted : sorted.slice(0, INITIAL_LIMIT);

  const open = (a: EncounterAlbum) => {
    setSelected({ id: a.id, title: a.title, artist: a.artist, artist_display: a.artist_display, year: a.year, genre: a.genre, cover_url: a.cover_url, ratings: [] } as unknown as AlbumWithRatings);
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {visible.map((a) => (
          <button
            key={a.id}
            onClick={() => open(a)}
            onMouseEnter={() => setHoveredId(a.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ padding: 0, background: "none", border: "none", cursor: "pointer", position: "relative" }}
            className="active:scale-[0.92] transition-transform"
            title={`${a.title} — ${a.artist_display ?? a.artist}`}
          >
            <div style={{
              width: 80, height: 80, borderRadius: 8, overflow: "hidden",
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              position: "relative",
            }}>
              {a.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 22 }}>♪</span>
                </div>
              )}

              {/* 점수 뱃지 */}
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                backgroundColor: "rgba(0,0,0,0.72)",
                borderRadius: 4, padding: "1px 5px",
                fontSize: 10, fontWeight: 700,
                color: scoreColor(a.score),
                lineHeight: 1.5,
              }}>
                {a.score}
              </div>

              {/* 호버 오버레이 */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundColor: "rgba(0,0,0,0.80)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: "8px 6px", gap: 3,
                opacity: hoveredId === a.id ? 1 : 0,
                transition: "opacity 0.18s ease",
                pointerEvents: "none",
              }}>
                <span style={{
                  color: "#fff", fontSize: 10, fontWeight: 700,
                  textAlign: "center", lineHeight: 1.35,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  width: "100%",
                }}>
                  {a.title}
                </span>
                <span style={{
                  color: scoreColor(a.score), fontSize: 14, fontWeight: 800, marginTop: 1,
                }}>
                  {a.score}점
                </span>
                <span style={{
                  color: "rgba(255,255,255,0.38)", fontSize: 9, marginTop: 1, letterSpacing: "0.03em",
                }}>
                  {formatDate(a.encounter_date)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {albums.length > INITIAL_LIMIT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: 12, color: "var(--text-muted)", fontSize: 11,
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "underline", padding: 0,
          }}
        >
          {showAll ? "접기" : `+${albums.length - INITIAL_LIMIT}장 더보기`}
        </button>
      )}

      {selected && (
        <AlbumModal album={selected} onClose={() => setSelected(null)} source="profile_encounter" />
      )}
    </>
  );
}
