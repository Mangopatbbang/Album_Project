"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumWithRatings, USERS } from "@/types";
import { scoreColor, glowBorder, glowShadow } from "@/lib/score";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

type Props = {
  artistName: string;        // API 조회용 spotify 정식 이름
  displayName?: string;      // 헤더 표시용 (variant 선택 시 한글명)
  onClose: () => void;
  onAlbumClick?: (album: AlbumWithRatings) => void;
};

export default function ArtistModal({ artistName, displayName, onClose, onAlbumClick }: Props) {
  const [albums, setAlbums] = useState<AlbumWithRatings[]>([]);
  const [avgScore, setAvgScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [closing, setClosing] = useState(false);
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    setFetchError(false);
    fetch(`/api/albums/by-artist?name=${encodeURIComponent(artistName)}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => {
        setAlbums(d.albums ?? []);
        setAvgScore(d.avg);
      })
      .catch(() => setFetchError(true))
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
        {/* 닫기 버튼 */}
        <div className="flex justify-end px-8 pt-6 shrink-0">
          <button
            onClick={handleClose}
            style={{ color: "var(--text-muted)", fontSize: 20, lineHeight: 1 }}
            className="hover:opacity-70 transition-opacity"
          >
            ✕
          </button>
        </div>

        {/* 아티스트 정보 영역 (추후 사진 + 상세 정보 추가 예정) */}
        <div className="px-10 pb-7 shrink-0">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            {/* 아티스트 사진 플레이스홀더 */}
            <div style={{
              width: 72, height: 72, borderRadius: 10, flexShrink: 0,
              backgroundColor: "var(--bg-elevated)",
              border: "1px dashed var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "var(--border-light)", fontSize: 22 }}>♪</span>
            </div>
            {/* 아티스트 이름 + 통계 */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <h2 style={{ color: "var(--text)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {displayName ?? artistName}
              </h2>
              {!loading && (
                <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
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
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, backgroundColor: "var(--border)", marginBottom: 0 }} />

        {/* 앨범 그리드 */}
        <div className="overflow-y-auto px-10 pt-5 pb-10">
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
            <div className="grid grid-cols-2 gap-5">
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
      className="rounded-lg overflow-hidden transition-opacity hover:opacity-80 active:opacity-60"
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
