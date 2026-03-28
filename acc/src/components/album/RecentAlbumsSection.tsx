"use client";

import { useState } from "react";
import Link from "next/link";
import { AlbumWithRatings } from "@/types";
import AlbumModal from "./AlbumModal";

type Props = {
  albums: AlbumWithRatings[];
};

export default function RecentAlbumsSection({ albums }: Props) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", textAlign: "left" }}
              className="rounded-lg overflow-hidden hover:border-[var(--border-light)] transition-colors cursor-pointer w-full"
            >
              <div
                style={{ backgroundColor: "var(--bg-elevated)", aspectRatio: "1/1" }}
                className="w-full flex items-center justify-center"
              >
                {album.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: "var(--text-muted)" }} className="text-xs">커버 없음</span>
                )}
              </div>
              <div className="p-3">
                <p style={{ color: "var(--text)", fontWeight: 500 }} className="text-sm truncate">
                  {album.title}
                </p>
                <p style={{ color: "var(--text-sub)" }} className="text-xs truncate mt-0.5">
                  {album.artist}
                </p>
                {avg && (
                  <p style={{ color: "var(--accent)" }} className="text-xs mt-2 font-medium">
                    ★ {avg}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />
      )}
    </>
  );
}
