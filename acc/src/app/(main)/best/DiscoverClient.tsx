"use client";

import { useState } from "react";
import Image from "next/image";
import AlbumModal from "@/components/album/AlbumModal";
import type { AlbumStat } from "@/lib/stats";
import { AlbumWithRatings } from "@/types";
import { scoreColor } from "@/lib/score";

function toAlbumWithRatings(a: AlbumStat): AlbumWithRatings {
  return {
    id: a.id,
    title: a.title,
    artist: a.artist,
    artist_display: a.artist_display,
    genre: a.genre ?? undefined,
    cover_url: a.cover_url ?? undefined,
    spotify_id: a.spotify_id ?? undefined,
    ratings: [],
  };
}

export default function DiscoverClient({ gems }: { gems: AlbumStat[] }) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  if (gems.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>✓</p>
        <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
          모두가 발견한 명반들이에요
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
          평균 7점 이상이지만 아직 평가자가 2명 이하인 앨범이 없어요.<br />
          모든 명반을 함께 발견했군요!
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
          평균 7점 이상이지만 아직 평가자가 2명 이하인 앨범들이에요. 먼저 들어보세요.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {gems.map((album) => (
          <button
            key={album.id}
            onClick={() => setSelectedAlbum(toAlbumWithRatings(album))}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 10,
              background: "none", border: "none", cursor: "pointer",
              textAlign: "left", width: "100%",
              transition: "background-color 0.12s",
            }}
            className="hover:bg-[var(--bg-card)]"
          >
            {/* 커버 */}
            <div style={{
              position: "relative", width: 48, height: 48,
              borderRadius: 6, overflow: "hidden",
              flexShrink: 0, border: "1px solid var(--border)",
              backgroundColor: "var(--bg-elevated)",
            }}>
              {album.cover_url ? (
                <Image fill sizes="48px" src={album.cover_url} alt={album.title} style={{ objectFit: "cover" }} />
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--text-muted)", fontSize: 16 }}>♪</span>
              )}
            </div>

            {/* 정보 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {album.title}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {album.artist_display ?? album.artist}
              </p>
            </div>

            {/* 점수 */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                backgroundColor: `${scoreColor(album.avg)}22`,
                color: scoreColor(album.avg),
                border: `1px solid ${scoreColor(album.avg)}44`,
                fontSize: 11, fontWeight: 800,
              }}>
                {album.avg.toFixed(1)}
              </span>
              <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 3 }}>{album.count}명 평가</p>
            </div>
          </button>
        ))}
      </div>

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} source="best" />
      )}
    </>
  );
}
