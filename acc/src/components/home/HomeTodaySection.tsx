"use client";

import { useState } from "react";
import { AlbumWithRatings } from "@/types";
import AlbumModal from "@/components/album/AlbumModal";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";

type Props = {
  initialAlbum: AlbumWithRatings | null;
};

function parseTracklist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((t) => t.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean);
}

export default function HomeTodaySection({ initialAlbum }: Props) {
  const [album, setAlbum] = useState<AlbumWithRatings | null>(initialAlbum);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const shuffle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/albums/random");
      const data = await res.json();
      if (data.id) setAlbum(data as AlbumWithRatings);
    } finally {
      setLoading(false);
    }
  };

  if (!album) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 160,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <button
          onClick={shuffle}
          disabled={loading}
          style={{
            color: "var(--accent)",
            fontSize: 13,
            fontWeight: 600,
            background: "none",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            padding: "10px 20px",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "찾는 중..." : "인연 찾기"}
        </button>
      </div>
    );
  }

  const scores = album.ratings?.map((r) => r.score) ?? [];
  const avg =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  const year = album.release_date?.slice(0, 4) ?? album.year ?? null;
  const tracks = parseTracklist(album.tracklist);
  const SHOW = 8;

  return (
    <>
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: `1px solid ${glowBorder(avg)}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: glowShadow(avg),
        }}
      >
        {/* 커버 + 기본 정보 */}
        <div style={{ display: "flex", gap: 14, padding: "14px 14px 0" }}>
          {/* 소형 커버 */}
          <div
            style={{
              flexShrink: 0,
              width: 140,
              height: 140,
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
              cursor: "pointer",
              position: "relative",
            }}
            onClick={() => setModalOpen(true)}
            className="group"
          >
            {album.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.cover_url}
                alt={album.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  transition: "transform 0.3s ease",
                }}
                className="group-hover:scale-[1.06]"
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 24,
                }}
              >
                ♪
              </div>
            )}
          </div>

          {/* 앨범 정보 */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <p
              style={{
                color: "var(--text)",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.35,
                marginBottom: 3,
              }}
              className="line-clamp-2"
            >
              {album.title}
            </p>
            <p
              style={{ color: "var(--text-sub)", fontSize: 12, marginBottom: 8 }}
              className="truncate"
            >
              {album.artist_display ?? album.artist}
            </p>

            {/* 메타 태그 (연도, 장르) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
              {year && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: 4,
                    padding: "2px 7px",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  {year}
                </span>
              )}
              {album.genre && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-elevated)",
                    borderRadius: 4,
                    padding: "2px 7px",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  {album.genre}
                </span>
              )}
            </div>

            {/* 평점 */}
            {avg !== null ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: scoreColor(avg), fontWeight: 700, fontSize: 13 }}>
                  ★ {avg}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  {scores.length}명 평가
                </span>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 11 }}>아직 평가 없음</p>
            )}
          </div>
        </div>

        {/* 트랙리스트 */}
        {tracks.length > 0 && (
          <div
            style={{
              margin: "12px 14px 0",
              borderTop: "1px solid var(--border)",
              paddingTop: 10,
            }}
          >
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              트랙리스트
            </p>
            {/* 2열 그리드 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 12,
                rowGap: 0,
              }}
            >
              {tracks.slice(0, SHOW).map((track, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 5,
                    padding: "3px 0",
                    borderBottom: "1px solid var(--border)",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      color: "var(--text-muted)",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      minWidth: 14,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      color: "var(--text-sub)",
                      fontSize: 11,
                      lineHeight: 1.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {track}
                  </span>
                </div>
              ))}
            </div>
            {tracks.length > SHOW && (
              <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 6 }}>
                +{tracks.length - SHOW}곡 더
              </p>
            )}
          </div>
        )}

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, padding: "12px 14px 14px" }}>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              flex: 1,
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "9px 0",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
            className="hover:opacity-85 active:opacity-70 transition-opacity"
          >
            감상하기
          </button>
          <button
            onClick={shuffle}
            disabled={loading}
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-sub)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "9px 14px",
              fontSize: 12,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.5 : 1,
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
            className="hover:border-[var(--border-light)] hover:text-[var(--text)] active:opacity-60"
          >
            {loading ? "···" : "다른 인연"}
          </button>
        </div>
      </div>

      {modalOpen && (
        <AlbumModal
          album={album}
          onClose={() => setModalOpen(false)}
          source="home_today"
          onSaved={async (albumId) => {
            const res = await fetch(`/api/albums/${albumId}`);
            if (!res.ok) return;
            const updated = await res.json();
            setAlbum(updated);
          }}
        />
      )}
    </>
  );
}
