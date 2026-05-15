"use client";

import { useState } from "react";
import { AlbumWithRatings } from "@/types";
import AlbumModal from "@/components/album/AlbumModal";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";

type Props = {
  initialAlbum: AlbumWithRatings | null;
};

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
        {/* 커버 */}
        <div
          style={{
            position: "relative",
            aspectRatio: "1/1",
            backgroundColor: "var(--bg-elevated)",
            cursor: "pointer",
            overflow: "hidden",
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
                transition: "transform 0.35s ease",
              }}
              className="group-hover:scale-[1.04]"
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
                fontSize: 32,
              }}
            >
              ♪
            </div>
          )}
          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.42)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              감상하기
            </span>
          </div>
        </div>

        {/* 정보 */}
        <div style={{ padding: "14px 16px 16px" }}>
          <p
            style={{
              color: "var(--text)",
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.35,
              marginBottom: 3,
            }}
            className="line-clamp-2"
          >
            {album.title}
          </p>
          <p style={{ color: "var(--text-sub)", fontSize: 12 }} className="truncate">
            {album.artist_display ?? album.artist}
          </p>

          {avg !== null ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
              <span style={{ color: scoreColor(avg), fontWeight: 700, fontSize: 13 }}>
                ★ {avg}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                {scores.length}명 평가
              </span>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 7 }}>
              아직 평가 없음
            </p>
          )}

          {/* 버튼 */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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
