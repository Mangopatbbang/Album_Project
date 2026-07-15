"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AlbumWithRatings } from "@/types";

const AlbumModal = dynamic(() => import("@/components/album/AlbumModal"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.5)" }} />,
});

export type WeeklyAlbum = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  cover_url?: string | null;
  use_artist_variant?: boolean | null;
};

function CoverImg({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%", paddingTop: "100%", borderRadius: 8, overflow: "hidden", backgroundColor: "var(--bg-elevated)" }}>
      {!loaded && <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0 }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />
    </div>
  );
}

export default function HomeWeeklySection({ albums }: { albums: WeeklyAlbum[] }) {
  const [selected, setSelected] = useState<WeeklyAlbum | null>(null);

  if (albums.length === 0) return null;

  const open = (album: WeeklyAlbum) => setSelected(album);

  return (
    <>
      <div>
        <h2 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em", marginBottom: 14 }}>
          이번 주 청음
        </h2>

        {/* 가로 스크롤 — 모바일/데스크탑 공통 */}
        <div
          className="no-scrollbar flex"
          style={{ gap: 12, overflowX: "auto", paddingBottom: 6 }}
        >
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => open(album)}
              style={{
                flexShrink: 0,
                width: 112,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <CoverImg src={album.cover_url ?? ""} alt={album.title} />
              <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 600, marginTop: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {album.title}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {album.artist_display ?? album.artist}
              </p>
            </button>
          ))}
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
