"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";

type RatingItem = {
  id: string;
  title: string;
  artist: string;
  year: string | null;
  genre: string | null;
  cover_url: string | null;
  score: number;
  one_line_review: string | null;
  updated_at: string;
};

function toModal(a: RatingItem): AlbumWithRatings {
  return { id: a.id, title: a.title, artist: a.artist, year: a.year ?? undefined, genre: a.genre ?? undefined, cover_url: a.cover_url ?? undefined, ratings: [] };
}

const INITIAL_COUNT = 8;

export function RecentListSection({ items }: { items: RatingItem[] }) {
  const [selected, setSelected] = useState<RatingItem | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, INITIAL_COUNT);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {visible.map((r) => (
          <div
            key={r.id + r.updated_at}
            onClick={() => setSelected(r)}
            className="rating-row"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "8px 10px", borderRadius: 8,
              cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div style={{
              width: 40, height: 40, flexShrink: 0, borderRadius: 4, overflow: "hidden",
              backgroundColor: "var(--bg-elevated)", border: `1px solid ${glowBorder(r.score)}`,
              boxShadow: glowShadow(r.score),
            }}>
              {r.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={r.cover_url} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14 }}>♪</span>
                  </div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.title}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1 }}>
                {r.artist}
                {r.genre && <span style={{ marginLeft: 6, opacity: 0.7 }}>{r.genre}</span>}
              </p>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>
              {new Date(r.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
            </span>
            <div style={{
              width: 32, height: 32, borderRadius: 6, flexShrink: 0,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: scoreColor(r.score), fontWeight: 700, fontSize: 14, lineHeight: 1, display: "block" }}>{r.score}</span>
            </div>
          </div>
        ))}
      </div>
      {items.length > INITIAL_COUNT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: 8, color: "var(--text-muted)", fontSize: 11,
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "underline", padding: 0,
          }}
        >
          {showAll ? "접기" : `+${items.length - INITIAL_COUNT}개 더보기`}
        </button>
      )}
      {selected && <AlbumModal album={toModal(selected)} onClose={() => setSelected(null)} />}
    </>
  );
}

export function RecentReviewsSection({ items }: { items: RatingItem[] }) {
  const [selected, setSelected] = useState<RatingItem | null>(null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((r) => (
          <div
            key={r.id + r.updated_at}
            onClick={() => setSelected(r)}
            style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", transition: "opacity 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <span style={{ color: scoreColor(r.score), fontWeight: 700, fontSize: 13, flexShrink: 0, width: 14, textAlign: "right" }}>{r.score}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic" }}>
                &ldquo;{r.one_line_review}&rdquo;
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.title}
              </p>
            </div>
          </div>
        ))}
      </div>
      {selected && <AlbumModal album={toModal(selected)} onClose={() => setSelected(null)} />}
    </>
  );
}
