"use client";

import { useState } from "react";
import Link from "next/link";
import { AlbumWithRatings } from "@/types";
import AlbumModal from "./AlbumModal";
import ArtistModal from "./ArtistModal";
import { glowShadow, glowBorder } from "@/lib/score";

type Props = {
  albums: AlbumWithRatings[];
};

export default function RecentAlbumsSection({ albums }: Props) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);

  if (albums.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <p style={{ fontSize: 24, marginBottom: 8 }}>♪</p>
        <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>아직 청음 기록이 없어요</p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
          <Link href="/albums" style={{ color: "var(--accent)", fontWeight: 600 }}>음반고</Link>에서 앨범을 평가하면 여기에 쌓여요
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 sm:overflow-x-visible sm:pb-0 md:grid-cols-4 sm:gap-4 sm:snap-none">
        {albums.map((album) => {
          const scores = album.ratings.map((r) => r.score);
          const avg =
            scores.length > 0
              ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
              : null;

          return (
            <button
              key={album.id}
              onClick={() => setSelectedAlbum(album)}
              style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${glowBorder(avg)}`, textAlign: "left", boxShadow: glowShadow(avg) }}
              className="flex-shrink-0 w-[148px] snap-start sm:w-full rounded-lg overflow-hidden transition-[border-color,transform] hover:border-[var(--border-light)] hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
            >
              <div
                style={{ backgroundColor: "var(--bg-elevated)", aspectRatio: "1/1" }}
                className="w-full flex items-center justify-center"
              >
                {album.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: "var(--text-muted)" }} className="text-xs">커버 없음</span>
                )}
              </div>
              <div className="p-3">
                <p style={{ color: "var(--text)", fontWeight: 500 }} className="text-sm truncate">
                  {album.title}
                </p>
                <p style={{ color: "var(--text-sub)" }} className="text-xs truncate mt-0.5">
                  <span
                    onClick={(e) => { e.stopPropagation(); setArtistModal({ name: album.artist, display: album.artist_display ?? album.artist }); }}
                    style={{ cursor: "pointer" }}
                    className="hover:underline"
                  >{album.artist_display ?? album.artist}</span>
                </p>
                <p style={{ color: "var(--accent)", visibility: avg ? "visible" : "hidden" }} className="text-xs mt-2 font-medium">
                  ★ {avg}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          source="home_feed"
          onSaved={async (albumId) => {
            const res = await fetch(`/api/albums/${albumId}`);
            if (!res.ok) return;
            const updated = await res.json();
            setSelectedAlbum((prev) => prev?.id === albumId ? { ...updated } : prev);
          }}
        />
      )}
      {artistModal && <ArtistModal artistName={artistModal.name} displayName={artistModal.display} onClose={() => setArtistModal(null)} onAlbumClick={(album) => { setArtistModal(null); setSelectedAlbum(album); }} source="home_feed" />}
    </>
  );
}
