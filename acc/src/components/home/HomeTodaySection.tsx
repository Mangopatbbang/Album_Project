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
  return raw.split("; ").map((t) => t.trim()).filter(Boolean);
}

export default function HomeTodaySection({ initialAlbum }: Props) {
  const [album, setAlbum] = useState<AlbumWithRatings | null>(initialAlbum);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [streamingOpen, setStreamingOpen] = useState(false);

  const openStreaming = (service: "spotify" | "apple" | "youtube") => {
    const query = encodeURIComponent(`${album?.title ?? ""} ${album?.artist_display ?? album?.artist ?? ""}`);
    let url = "";
    if (service === "spotify") {
      url = album?.spotify_id
        ? `https://open.spotify.com/album/${album.spotify_id}`
        : `https://open.spotify.com/search/${query}`;
    } else if (service === "apple") {
      url = `https://music.apple.com/search?term=${query}`;
    } else {
      url = `https://music.youtube.com/search?q=${query}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setStreamingOpen(false);
  };

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
  const SHOW = 6;

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
        {/* 커버 + 우측 정보 (트랙리스트 포함) */}
        <div style={{ display: "flex", alignItems: "flex-start", padding: "14px 14px 0", gap: 14 }}>

          {/* 커버 */}
          <div
            style={{ flexShrink: 0, borderRadius: 8, overflow: "hidden", backgroundColor: "var(--bg-elevated)", cursor: "pointer" }}
            className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] group relative"
            onClick={() => setModalOpen(true)}
          >
            {album.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.cover_url}
                alt={album.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease" }}
                className="group-hover:scale-[1.06]"
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 24 }}>
                ♪
              </div>
            )}
          </div>

          {/* 우측: 기본 정보 + 트랙리스트 */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2, display: "flex", flexDirection: "column", gap: 0 }}>
            {/* 타이틀 */}
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, lineHeight: 1.35, marginBottom: 2 }} className="line-clamp-2">
              {album.title}
            </p>
            {/* 아티스트 */}
            <p style={{ color: "var(--text-sub)", fontSize: 12, marginBottom: 8 }} className="truncate">
              {album.artist_display ?? album.artist}
            </p>

            {/* 메타 + 평점 한 줄 */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginBottom: 0 }}>
              {year && (
                <span style={{ fontSize: 10, color: "var(--text-muted)", backgroundColor: "var(--bg-elevated)", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>
                  {year}
                </span>
              )}
              {album.genre && (
                <span style={{ fontSize: 10, color: "var(--text-muted)", backgroundColor: "var(--bg-elevated)", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>
                  {album.genre}
                </span>
              )}
              {avg !== null ? (
                <span style={{ fontSize: 10, color: scoreColor(avg), fontWeight: 700, backgroundColor: "var(--bg-elevated)", borderRadius: 4, padding: "2px 7px" }}>
                  {avg} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({scores.length})</span>
                </span>
              ) : (
                <span style={{ fontSize: 10, color: "var(--text-muted)", backgroundColor: "var(--bg-elevated)", borderRadius: 4, padding: "2px 7px" }}>
                  평가 없음
                </span>
              )}
            </div>

            {/* 트랙리스트 — 데스크탑 전용 */}
            {tracks.length > 0 && (
              <div className="hidden sm:block" style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>
                  Tracklist
                </p>
                {tracks.slice(0, SHOW).map((track, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2.5px 0" }}>
                    <span style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: 9, fontWeight: 700, minWidth: 12, textAlign: "right" }}>
                      {i + 1}
                    </span>
                    <span style={{ color: "var(--text-sub)", fontSize: 11, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {track}
                    </span>
                  </div>
                ))}
                {tracks.length > SHOW && (
                  <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4 }}>
                    +{tracks.length - SHOW}곡 더
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ padding: "12px 14px 14px" }}>
          {streamingOpen ? (
            <div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
                어디서 들을까요?
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <button
                  onClick={() => openStreaming("spotify")}
                  style={{ flex: 1, background: "#1DB954", color: "#000", border: "none", borderRadius: 7, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  className="active:opacity-70 transition-opacity"
                >
                  Spotify
                </button>
                <button
                  onClick={() => openStreaming("apple")}
                  style={{ flex: 1, background: "#FC3C44", color: "#fff", border: "none", borderRadius: 7, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  className="active:opacity-70 transition-opacity"
                >
                  Apple Music
                </button>
                <button
                  onClick={() => openStreaming("youtube")}
                  style={{ flex: 1, background: "#FF0000", color: "#fff", border: "none", borderRadius: 7, padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  className="active:opacity-70 transition-opacity"
                >
                  YouTube
                </button>
              </div>
              <button
                onClick={() => setStreamingOpen(false)}
                style={{ width: "100%", background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 0", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
                className="hover:border-[var(--border-light)] hover:text-[var(--text)] active:opacity-60 transition-all"
              >
                취소
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setStreamingOpen(true)}
                style={{ flex: 1, backgroundColor: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}
                className="hover:opacity-85 active:opacity-70 transition-opacity"
              >
                감상하기 ↗
              </button>
              <button
                onClick={() => setModalOpen(true)}
                style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 14px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
                className="hover:border-[var(--border-light)] hover:text-[var(--text)] active:opacity-60 transition-all"
              >
                평가하기
              </button>
              <button
                onClick={shuffle}
                disabled={loading}
                style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 14px", fontSize: 12, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap" }}
                className="hover:border-[var(--border-light)] hover:text-[var(--text)] active:opacity-60"
              >
                {loading ? "···" : "다른 인연"}
              </button>
            </div>
          )}
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
