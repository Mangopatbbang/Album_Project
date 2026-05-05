"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumWithRatings, USERS } from "@/types";
import { scoreColor, glowBorder, glowShadow } from "@/lib/score";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import UserAvatar from "@/components/ui/UserAvatar";

type Props = {
  artistName: string;
  displayName?: string;
  onClose: () => void;
  onAlbumClick?: (album: AlbumWithRatings) => void;
};

export default function ArtistModal({ artistName, displayName, onClose, onAlbumClick }: Props) {
  const [albums, setAlbums] = useState<AlbumWithRatings[]>([]);
  const avatarMap = useUserAvatars();
  const [avgScore, setAvgScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [closing, setClosing] = useState(false);
  const [artistImage, setArtistImage] = useState<string | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    setFetchError(false);

    fetch(`/api/albums/by-artist?name=${encodeURIComponent(artistName)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setAlbums(d.albums ?? []); setAvgScore(d.avg); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));

    fetch(`/api/spotify/artist?name=${encodeURIComponent(artistName)}`)
      .then((r) => r.ok ? r.json() : { image_url: null, genres: [] })
      .then((d) => {
        if (d.image_url) setArtistImage(d.image_url);
        if (d.genres?.length) setGenres(d.genres.slice(0, 4));
      })
      .catch(() => {});
  }, [artistName]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
      style={{ zIndex: 110, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          width: "min(960px, 100%)",
          maxHeight: "88dvh",
          animation: closing ? "modalOut 0.18s ease forwards" : "modalIn 0.22s ease",
        }}
      >
        {/* 닫기 버튼 */}
        <div className="flex justify-end px-6 pt-5 shrink-0">
          <button
            onClick={handleClose}
            style={{ color: "var(--text-muted)", fontSize: 20, lineHeight: 1 }}
            className="hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* 아티스트 정보 영역 */}
        <div className="px-6 pt-1 pb-6 shrink-0">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            {/* 아티스트 사진 */}
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 88, height: 88, borderRadius: 12,
                backgroundColor: "var(--bg-elevated)",
                border: artistImage ? "none" : "1px dashed var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {artistImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artistImage} alt={displayName ?? artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "var(--border-light)", fontSize: 22 }}>♪</span>
                )}
              </div>
              {artistImage && (
                <a
                  href={`https://open.spotify.com/search/${encodeURIComponent(artistName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Spotify에서 보기"
                  style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 9 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Spotify
                </a>
              )}
            </div>

            {/* 이름 + 통계 + 장르 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ color: "var(--text)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {displayName ?? artistName}
              </h2>

              {!loading && (
                <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    앨범 <span style={{ color: "var(--text-sub)", fontWeight: 600 }}>{albums.length}</span>장
                  </span>
                  {avgScore && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      평균 <span style={{ color: scoreColor(avgScore), fontWeight: 700 }}>{avgScore}</span>
                    </span>
                  )}
                </div>
              )}

              {genres.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
                  {genres.map((g) => (
                    <span key={g} style={{
                      fontSize: 10, fontWeight: 600,
                      color: "var(--text-secondary)",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "2px 6px",
                      letterSpacing: "0.02em",
                    }}>
                      {g}
                    </span>
                  ))}
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(artistName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Spotify에서 보기"
                    style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,0.35)", textDecoration: "none", flexShrink: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-label="Spotify">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, backgroundColor: "var(--border)" }} />

        {/* 앨범 그리드 */}
        <div className="overflow-y-auto px-6 pt-4 pb-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>불러오는 중…</span>
            </div>
          ) : fetchError ? (
            <div className="flex justify-center py-16">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>불러오기 실패 — 잠시 후 다시 시도해주세요</span>
            </div>
          ) : albums.length === 0 ? (
            <div className="flex justify-center py-16">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>등록된 앨범이 없습니다</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {albums.map((album) => (
                <ArtistAlbumCard
                  key={album.id}
                  album={album}
                  artistName={artistName}
                  onClick={onAlbumClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn  { from { opacity:0; transform:scale(0.95) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes modalOut { from { opacity:1; transform:scale(1) translateY(0) } to { opacity:0; transform:scale(0.95) translateY(8px) } }
      `}</style>
    </div>
  );
}

function ArtistAlbumCard({ album, artistName, onClick }: { album: AlbumWithRatings; artistName: string; onClick?: (album: AlbumWithRatings) => void }) {
  const isFeat = album.artist.toLowerCase() !== artistName.toLowerCase();
  const avatarMap = useUserAvatars();
  return (
    <button
      onClick={() => onClick?.(album)}
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: `1px solid ${glowBorder(album.avg)}`,
        textAlign: "left",
        width: "100%",
        boxShadow: glowShadow(album.avg),
        cursor: onClick ? "pointer" : "default",
      }}
      className="rounded-lg overflow-hidden transition-opacity hover:opacity-80 active:opacity-60"
    >
      <div style={{ backgroundColor: "var(--bg-card)", aspectRatio: "1/1" }} className="w-full flex items-center justify-center overflow-hidden">
        {album.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: 20 }}>♪</span>
        )}
      </div>

      <div style={{ height: 2, backgroundColor: "var(--bg-card)" }}>
        {album.avg && (
          <div style={{
            height: "100%",
            width: `${(parseFloat(album.avg) / 10) * 100}%`,
            backgroundColor: scoreColor(album.avg),
            boxShadow: parseFloat(album.avg) >= 7 ? `0 0 4px ${scoreColor(album.avg)}` : "none",
            transition: "width 0.4s ease",
          }} />
        )}
      </div>

      <div style={{ padding: "7px 8px 8px" }}>
        <div className="flex items-baseline justify-between gap-1">
          <p style={{ color: "var(--text)", fontWeight: 500, fontSize: 11, lineHeight: 1.3 }} className="truncate">
            {album.title}
          </p>
          {album.avg && (
            <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
              {album.avg}
            </span>
          )}
        </div>

        {isFeat && (
          <p style={{ color: "var(--text-muted)", fontSize: 9.5, marginTop: 2, lineHeight: 1.3 }} className="truncate">
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: "0.04em",
              backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 3, padding: "1px 4px", marginRight: 4,
              color: "var(--accent)", verticalAlign: "middle",
            }}>feat.</span>
            {album.artist_display ?? album.artist}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-0.5">
          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
            {album.year ?? album.release_date?.slice(0, 4) ?? ""}
          </span>
          {album.genre && (
            <span style={{
              fontSize: 9, color: "var(--text-muted)", backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: 3, padding: "0px 4px",
              lineHeight: 1.6, flexShrink: 0, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {album.genre}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-wrap mt-1">
          {USERS.map((user) => {
            const r = album.ratings.find((rt) => rt.user_id === user.id);
            if (!r) return null;
            return (
              <span key={user.id} style={{ fontSize: 9.5, color: scoreColor(r.score), display: "inline-flex", alignItems: "center", gap: 1 }}>
                <UserAvatar avatarUrl={avatarMap[user.id]} size={11} />{r.score}
              </span>
            );
          })}
        </div>
      </div>
    </button>
  );
}
