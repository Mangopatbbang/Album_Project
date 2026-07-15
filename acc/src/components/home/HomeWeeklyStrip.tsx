"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AlbumWithRatings } from "@/types";

const AlbumModal = dynamic(() => import("@/components/album/AlbumModal"), { ssr: false });

export type WeeklyStripItem = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  cover_url?: string | null;
  use_artist_variant?: boolean | null;
};

export default function HomeWeeklyStrip({ albums }: { albums: WeeklyStripItem[] }) {
  const [selected, setSelected] = useState<WeeklyStripItem | null>(null);

  if (albums.length === 0) return null;

  return (
    <>
      <div style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" }}>
        <div
          style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 24px" }}
        >
          <div className="no-scrollbar" style={{ display: "flex", alignItems: "center", gap: 14, overflowX: "auto" }}>
            {/* 레이블 */}
            <span style={{
              fontSize: 10, color: "var(--text-muted)", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0,
            }}>
              이번 주 청음
            </span>
            <div style={{ width: 1, height: 14, backgroundColor: "var(--border)", flexShrink: 0 }} />

            {/* 앨범 칩 목록 */}
            {albums.map((album, i) => (
              <button
                key={album.id}
                onClick={() => setSelected(album)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  flexShrink: 0, background: "none", border: "none",
                  padding: "2px 0", cursor: "pointer", textAlign: "left",
                }}
              >
                {/* 구분 점 (첫 항목 제외) */}
                {i > 0 && (
                  <span style={{ color: "var(--border)", fontSize: 10, marginRight: -3 }}>·</span>
                )}
                {album.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.cover_url}
                    alt={album.title}
                    style={{ width: 24, height: 24, borderRadius: 3, objectFit: "cover", flexShrink: 0 }}
                  />
                )}
                <span style={{ fontSize: 12, color: "var(--text-sub)", whiteSpace: "nowrap" }}>
                  {album.title}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {album.artist_display ?? album.artist}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <AlbumModal
          album={selected as AlbumWithRatings}
          onClose={() => setSelected(null)}
          source="home_weekly"
        />
      )}
    </>
  );
}
