"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlbumWithRatings } from "@/types";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

const AlbumModal = dynamic(() => import("@/components/album/AlbumModal"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.5)" }} />,
});
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";
import { useAuth } from "@/context/AuthContext";

type Props = {
  initialAlbum: AlbumWithRatings | null;
};

function parseTracklist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(";").map((t) => t.trim()).filter(Boolean);
}

function getSectionLabel(): string {
  const h = new Date().getHours();
  if (h < 5)  return "새벽 청음";
  if (h < 10) return "아침 인연";
  if (h < 18) return "오늘의 인연";
  if (h < 21) return "저녁 청음";
  return "밤의 인연";
}

export default function HomeTodaySection({ initialAlbum }: Props) {
  const { profile } = useAuth();
  const [album, setAlbum] = useState<AlbumWithRatings | null>(initialAlbum);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [streamingOpen, setStreamingOpen] = useState(false);
  const [trackHover, setTrackHover] = useState(false);
  const [tracklistOpen, setTracklistOpen] = useState(false);
  const autoShuffledRef = useRef(false);

  // 이미 평가한 앨범이 오늘의 인연으로 뜨면 자동으로 미평가 앨범으로 교체
  useEffect(() => {
    if (!profile || !album || autoShuffledRef.current) return;
    if (album.ratings.some((r) => r.user_id === profile.id)) {
      autoShuffledRef.current = true;
      shuffle();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, album?.id]);

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
    setAlbum(null);       // 이전 앨범 즉시 제거 — 이전 세션 데이터 잔류 방지
    setLoading(true);
    setCoverLoaded(false);
    setTracklistOpen(false);
    try {
      const url = profile?.id
        ? `/api/albums/random?userId=${profile.id}`
        : "/api/albums/random";
      const res = await fetch(url);
      const data = await res.json();
      if (data.id) setAlbum(data as AlbumWithRatings);
    } finally {
      setLoading(false);
    }
  };

  const sectionLabel = getSectionLabel();

  if (!album) {
    return (
      <div className="sm:flex sm:flex-col sm:flex-1">
        <h2 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em", marginBottom: 12 }}>
          {sectionLabel}
        </h2>
        <div
          className="sm:flex-1"
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
      </div>
    );
  }

  const scores = album.ratings?.map((r) => r.score) ?? [];
  const avg =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  const myRating = album.ratings?.find((r) => r.user_id === profile?.id);
  const offsetBorderColor = myRating?.score ? scoreColor(myRating.score) : "var(--border)";

  const year = album.release_date?.slice(0, 4) ?? null;
  const tracks = parseTracklist(album.tracklist);
  const COLLAPSED_SHOW = 4;
  const tagStyle = { fontSize: 10, color: "var(--text-muted)" as const, backgroundColor: "var(--bg-elevated)" as const, borderRadius: 4, padding: "2px 7px", fontWeight: 600 };

  return (
    <div className="sm:flex sm:flex-col sm:flex-1">
      <h2 style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em", marginBottom: 12 }}>
        {sectionLabel}
      </h2>
      <div
        key={album.id}
        data-tour="today-card"
        className="sm:flex-1"
        style={{
          backgroundColor: "var(--bg-card)",
          border: `1px solid ${glowBorder(avg)}`,
          borderRadius: 12,
          boxShadow: glowShadow(avg),
          animation: "encounterFadeIn 1.6s ease-out",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 커버 + 우측 정보 */}
        <div style={{ display: "flex", alignItems: "flex-start", padding: "14px 14px 0", gap: 14 }}>

          {/* 커버 — offset card wrapper (offset 그림자는 데스크탑 전용) */}
          <div style={{ position: "relative", flexShrink: 0 }} className="sm:mr-[6px] sm:mb-[6px]">
            <div
              className="hidden sm:block"
              style={{
                position: "absolute",
                top: 6, left: 6, right: -6, bottom: -6,
                border: `1px solid ${offsetBorderColor}`,
                borderRadius: 8,
              }}
            />
            <div
              style={{ borderRadius: 8, overflow: "hidden", backgroundColor: "var(--bg-elevated)", cursor: "pointer", transition: "opacity 0.1s", position: "relative", zIndex: 1 }}
              className="w-[96px] h-[96px] sm:w-[140px] sm:h-[140px] group today-cover"
              onClick={() => setModalOpen(true)}
            >
              {album.cover_url ? (
                <>
                  {!coverLoaded && <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0 }} />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={album.cover_url}
                    alt={album.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease, opacity 0.25s ease", opacity: coverLoaded ? 1 : 0 }}
                    className="group-hover:scale-[1.06]"
                    onLoad={() => setCoverLoaded(true)}
                  />
                </>
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 24 }}>
                  ♪
                </div>
              )}
            </div>
          </div>

          {/* 우측: 타이틀 / 아티스트 / 태그 / 트랙리스트 */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2, display: "flex", flexDirection: "column" }}>

            {/* 모바일 전용: 제목 → 아티스트 → 태그 → 트랙리스트 버튼 */}
            <div className="flex flex-col sm:hidden" style={{ gap: 4 }}>
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, lineHeight: 1.35 }} className="line-clamp-2">
                {album.title}
              </p>
              <p style={{ color: "var(--text-sub)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {album.artist_display ?? album.artist}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                {year && <span style={tagStyle}>{year}</span>}
                {album.genre && <span style={tagStyle}>{album.genre}</span>}
                {avg !== null ? (
                  <span style={{ fontSize: 10, color: scoreColor(avg), fontWeight: 700, backgroundColor: "var(--bg-elevated)", borderRadius: 4, padding: "2px 7px" }}>
                    {avg} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({scores.length})</span>
                  </span>
                ) : (
                  <span style={tagStyle}>평가 없음</span>
                )}
              </div>
              {tracks.length > 0 && (
                <button
                  onClick={() => setTracklistOpen((v) => !v)}
                  style={{
                    background: "none", border: "1px solid var(--border)", borderRadius: 6,
                    color: "var(--text-muted)", fontSize: 11, padding: "3px 10px",
                    cursor: "pointer", alignSelf: "flex-start", marginTop: 2,
                    transition: "border-color 0.15s",
                  }}
                >
                  트랙리스트 {tracks.length}곡 {tracklistOpen ? "↑" : "↓"}
                </button>
              )}
            </div>

            {/* 데스크탑 전용: 제목+태그 가로 줄 → 아티스트 → 트랙리스트 블록 */}
            <div className="hidden sm:flex sm:flex-col">
              <div className="sm:flex sm:items-start sm:gap-2" style={{ marginBottom: 5 }}>
                <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14, lineHeight: 1.35 }} className="sm:flex-1">
                  {album.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }} className="sm:flex-shrink-0 sm:flex-nowrap">
                  {year && <span style={tagStyle}>{year}</span>}
                  {album.genre && <span style={tagStyle}>{album.genre}</span>}
                  {avg !== null ? (
                    <span style={{ fontSize: 10, color: scoreColor(avg), fontWeight: 700, backgroundColor: "var(--bg-elevated)", borderRadius: 4, padding: "2px 7px" }}>
                      {avg} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({scores.length})</span>
                    </span>
                  ) : (
                    <span style={tagStyle}>평가 없음</span>
                  )}
                </div>
              </div>
              <p style={{ color: "var(--text-sub)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {album.artist_display ?? album.artist}
              </p>
              {tracks.length > 0 && (
                <div
                  className="hidden sm:block"
                  style={{ position: "relative", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}
                  onMouseEnter={() => setTrackHover(true)}
                  onMouseLeave={() => setTrackHover(false)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                      Tracklist
                    </p>
                    <SpotifyAttribution spotifyId={album.spotify_id} size="sm" />
                  </div>
                  {tracks.slice(0, COLLAPSED_SHOW).map((track, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2.5px 0" }}>
                      <span style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: 9, fontWeight: 700, minWidth: 12, textAlign: "right" }}>
                        {i + 1}
                      </span>
                      <span style={{ color: "var(--text-sub)", fontSize: 11, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                        {track}
                      </span>
                    </div>
                  ))}
                  {tracks.length > COLLAPSED_SHOW && (
                    <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4 }}>
                      +{tracks.length - COLLAPSED_SHOW}곡 더
                    </p>
                  )}

                  {/* 호버 시 전체 트랙 오버레이 */}
                  {trackHover && tracks.length > COLLAPSED_SHOW && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      zIndex: 20,
                      boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <p style={{ color: "var(--text-muted)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                          Tracklist
                        </p>
                        <SpotifyAttribution spotifyId={album.spotify_id} size="sm" />
                      </div>
                      {tracks.map((track, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2.5px 0" }}>
                          <span style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: 9, fontWeight: 700, minWidth: 12, textAlign: "right" }}>
                            {i + 1}
                          </span>
                          <span style={{ color: "var(--text-sub)", fontSize: 11, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                            {track}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 모바일 트랙리스트 패널 (sm:hidden) — max-height 슬라이드 */}
        {tracks.length > 0 && (
          <div
            className="sm:hidden"
            style={{
              overflow: "hidden",
              maxHeight: tracklistOpen ? 500 : 0,
              transition: tracklistOpen
                ? "max-height 0.32s cubic-bezier(0.22, 1, 0.36, 1)"
                : "max-height 0.22s cubic-bezier(0.4, 0, 1, 1)",
            }}
          >
            <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tracklist</p>
                <SpotifyAttribution spotifyId={album.spotify_id} size="sm" />
              </div>
              {tracks.map((track, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2.5px 0" }}>
                  <span style={{ flexShrink: 0, color: "var(--text-muted)", fontSize: 9, fontWeight: 700, minWidth: 12, textAlign: "right" }}>{i + 1}</span>
                  <span style={{ color: "var(--text-sub)", fontSize: 12, lineHeight: 1.4 }}>{track}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div style={{ padding: "12px 14px 6px", marginTop: "auto" }}>
          <div style={{ position: "relative", height: 44 }}>

            {/* 기본 row: 감상하기 / 평가하기 / 다른 인연 */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", gap: 8,
              opacity: streamingOpen ? 0 : 1,
              transform: streamingOpen ? "translateX(-14px)" : "translateX(0)",
              transition: "opacity 0.18s ease, transform 0.22s ease",
              pointerEvents: streamingOpen ? "none" : "auto",
            }}>
              <button
                data-tour="today-streaming-btn"
                onClick={() => setStreamingOpen(true)}
                style={{ flex: 1, backgroundColor: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}
                className="hover:opacity-85 active:opacity-70 transition-opacity"
              >
                감상하기 ↗
              </button>
              <button
                onClick={() => setModalOpen(true)}
                style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 14px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
                className="hover:border-[var(--border-light)] hover:text-[var(--text)] active:opacity-60 transition-[border-color,color,opacity]"
              >
                평가하기
              </button>
              <button
                data-tour="today-shuffle-btn"
                onClick={shuffle}
                disabled={loading}
                style={{
                  backgroundColor: "var(--bg-elevated)", color: "var(--text-sub)",
                  border: "1px solid var(--border)", borderRadius: 8,
                  padding: "0 12px", height: 44, flexShrink: 0,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.4 : 1,
                  fontSize: 12, whiteSpace: "nowrap",
                  transition: "border-color 0.15s, color 0.15s, opacity 0.15s",
                }}
                className="hover:border-[var(--border-light)] hover:text-[var(--text)] active:opacity-60"
              >
                {loading ? "···" : "다른 인연"}
              </button>
            </div>

            {/* 스트리밍 row: Spotify / Apple / YouTube / ✕ */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", gap: 6,
              opacity: streamingOpen ? 1 : 0,
              transform: streamingOpen ? "translateX(0)" : "translateX(14px)",
              transition: "opacity 0.18s ease, transform 0.22s ease",
              pointerEvents: streamingOpen ? "auto" : "none",
            }}>
              <button
                onClick={() => openStreaming("spotify")}
                style={{ flex: 1, background: "#1DB954", color: "#000", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                className="active:opacity-70 transition-opacity"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Spotify
              </button>
              <button
                onClick={() => openStreaming("apple")}
                style={{ flex: 1, background: "#FC3C44", color: "#fff", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                className="active:opacity-70 transition-opacity"
              >
                Apple
              </button>
              <button
                onClick={() => openStreaming("youtube")}
                style={{ flex: 1, background: "#FF0000", color: "#fff", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                className="active:opacity-70 transition-opacity"
              >
                YouTube
              </button>
              <button
                onClick={() => setStreamingOpen(false)}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "0 11px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                className="hover:border-[var(--border-light)] hover:text-[var(--text)] active:opacity-60 transition-[border-color,color,opacity]"
              >
                취소
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes encounterFadeIn {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {modalOpen && (
        <AlbumModal
          album={album}
          onClose={() => setModalOpen(false)}
          source="home_today"
          isEncounter={true}
          onSaved={async (albumId, updatedAlbum) => {
            if (albumId !== album?.id) return;
            if (updatedAlbum) { setAlbum(updatedAlbum as AlbumWithRatings); return; }
            const res = await fetch(`/api/albums/${albumId}?_=${Date.now()}`, { cache: "no-store" });
            if (!res.ok) return;
            const updated = await res.json();
            setAlbum(updated);
          }}
        />
      )}
    </div>
  );
}
