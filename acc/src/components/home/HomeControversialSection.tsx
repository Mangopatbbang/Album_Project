"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import { scoreColor } from "@/lib/score";

export type ControversialItem = {
  album_id: string;
  album_title: string;
  album_artist: string;
  album_artist_display: string;
  album_cover_url: string | null;
  min_score: number;
  max_score: number;
  variance: number;
  rating_count: number;
  low_review: string | null;
  high_review: string | null;
};

function CoverThumb({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!loaded && <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0, borderRadius: 4 }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
      />
    </div>
  );
}

export default function HomeControversialSection({ items }: { items: ControversialItem[] }) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  const openAlbum = (item: ControversialItem) => {
    setSelectedAlbum({
      id: item.album_id,
      title: item.album_title,
      artist: item.album_artist,
      artist_display: item.album_artist_display,
      cover_url: item.album_cover_url ?? undefined,
      ratings: [],
    });
  };

  return (
    <>
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "4px 14px",
        flex: 1,
      }}>
        {items.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "20px 0", textAlign: "center", lineHeight: 1.7 }}>
            같은 앨범에 엇갈린 평가가<br />쌓이면 여기에 나타나요
          </p>
        ) : (
          items.map((item, i) => (
            <div
              key={item.album_id}
              onClick={() => openAlbum(item)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 0",
                borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
              className="hover:opacity-75 active:opacity-65 transition-opacity"
            >
              {/* 커버 */}
              <div style={{
                flexShrink: 0, width: 44, height: 44,
                borderRadius: 6, overflow: "hidden",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}>
                {item.album_cover_url
                  ? <CoverThumb src={item.album_cover_url} alt={item.album_title} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>♪</div>
                }
              </div>

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 제목 + 점수 범위 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                    {item.album_title}
                  </p>
                  <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: "-0.02em" }}>
                    <span style={{ color: scoreColor(item.min_score) }}>{item.min_score}</span>
                    <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ~ </span>
                    <span style={{ color: scoreColor(item.max_score) }}>{item.max_score}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 400 }}>점</span>
                  </span>
                </div>
                {/* 아티스트 */}
                <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                  {item.album_artist_display}
                </p>
                {/* 리뷰 스니펫 */}
                {(item.low_review || item.high_review) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {item.high_review && (
                      <p style={{ color: "var(--text-muted)", fontSize: 10, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ color: scoreColor(item.max_score), fontStyle: "normal", fontWeight: 700, marginRight: 4 }}>{item.max_score}점</span>
                        &ldquo;{item.high_review}&rdquo;
                      </p>
                    )}
                    {item.low_review && (
                      <p style={{ color: "var(--text-muted)", fontSize: 10, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ color: scoreColor(item.min_score), fontStyle: "normal", fontWeight: 700, marginRight: 4 }}>{item.min_score}점</span>
                        &ldquo;{item.low_review}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          source="home_controversial"
        />
      )}
    </>
  );
}
