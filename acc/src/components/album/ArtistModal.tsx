"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumWithRatings, USERS } from "@/types";
import { scoreColor, glowBorder, glowShadow } from "@/lib/score";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

type Props = {
  artistName: string;
  onClose: () => void;
  onAlbumClick?: (album: AlbumWithRatings) => void;
};

export default function ArtistModal({ artistName, onClose, onAlbumClick }: Props) {
  const [albums, setAlbums] = useState<AlbumWithRatings[]>([]);
  const [avgScore, setAvgScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    fetch(`/api/albums/by-artist?name=${encodeURIComponent(artistName)}`)
      .then((r) => r.json())
      .then((d) => {
        setAlbums(d.albums ?? []);
        setAvgScore(d.avg);
      })
      .finally(() => setLoading(false));
  }, [artistName]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 110, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          width: "min(640px, 100%)",
          maxHeight: "80vh",
          animation: closing ? "modalOut 0.18s ease forwards" : "modalIn 0.22s ease",
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-baseline gap-3 min-w-0">
            <h2
              style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}
              className="truncate"
            >
              {artistName}
            </h2>
            {!loading && (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                앨범 {albums.length}장
                {avgScore && (
                  <span style={{ color: scoreColor(avgScore), marginLeft: 6 }}>
                    avg {avgScore}
                  </span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{ color: "var(--text-muted)", fontSize: 20, lineHeight: 1 }}
            className="ml-3 shrink-0 hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* 바디 */}
        <div className="overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>불러오는 중…</span>
            </div>
          ) : albums.length === 0 ? (
            <div className="flex justify-center py-12">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>등록된 앨범이 없습니다</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {albums.map((album) => (
                <ArtistAlbumCard
                  key={album.id}
                  album={album}
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

function ArtistAlbumCard({
  album,
  onClick,
}: {
  album: AlbumWithRatings;
  onClick?: (album: AlbumWithRatings) => void;
}) {
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
      className="rounded-lg overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.97]"
    >
      {/* 커버 */}
      <div
        style={{ backgroundColor: "var(--bg-card)", aspectRatio: "1/1" }}
        className="w-full flex items-center justify-center overflow-hidden"
      >
        {album.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: 24 }}>♪</span>
        )}
      </div>

      {/* 점수 바 */}
      <div style={{ height: 3, backgroundColor: "var(--bg-card)" }}>
        {album.avg && (
          <div
            style={{
              height: "100%",
              width: `${(parseFloat(album.avg) / 10) * 100}%`,
              backgroundColor: scoreColor(album.avg),
              boxShadow: parseFloat(album.avg) >= 7 ? `0 0 6px ${scoreColor(album.avg)}` : "none",
              transition: "width 0.4s ease",
            }}
          />
        )}
      </div>

      {/* 정보 */}
      <div className="p-2.5">
        <div className="flex items-baseline justify-between gap-1">
          <p
            style={{ color: "var(--text)", fontWeight: 500, fontSize: 12 }}
            className="truncate leading-snug"
          >
            {album.title}
          </p>
          {album.avg && (
            <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
              {album.avg}
            </span>
          )}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 11 }} className="truncate mt-0.5">
          {album.year ?? album.release_date?.slice(0, 4) ?? ""}
        </p>

        {/* 유저별 평점 */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            {USERS.map((user) => {
              const r = album.ratings.find((rt) => rt.user_id === user.id);
              if (!r) return null;
              return (
                <span key={user.id} style={{ fontSize: 10, color: scoreColor(r.score) }}>
                  {user.emoji}{r.score}
                </span>
              );
            })}
          </div>
          <SpotifyAttribution spotifyId={album.spotify_id} />
        </div>
      </div>
    </button>
  );
}
