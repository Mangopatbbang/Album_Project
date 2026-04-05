"use client";

import { AlbumWithRatings, USERS } from "@/types";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

type Props = {
  album: AlbumWithRatings;
  onClick: (album: AlbumWithRatings) => void;
};

export default function AlbumCard({ album, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(album)}
      style={{
        backgroundColor: "var(--bg-card)",
        border: `1px solid ${glowBorder(album.avg)}`,
        textAlign: "left",
        width: "100%",
        boxShadow: glowShadow(album.avg),
      }}
      className="rounded-lg overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.97] cursor-pointer"
    >
      {/* 커버 이미지 */}
      <div
        style={{ backgroundColor: "var(--bg-elevated)", aspectRatio: "1/1" }}
        className="w-full flex items-center justify-center overflow-hidden"
      >
        {album.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover_url}
            alt={album.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span style={{ color: "var(--text-muted)", fontSize: 28 }}>♪</span>
            <span style={{ color: "var(--text-muted)" }} className="text-xs">커버 없음</span>
          </div>
        )}
      </div>

      {/* 점수 컬러 바 */}
      <div style={{ height: 3, backgroundColor: "var(--bg-elevated)" }}>
        {album.avg && (
          <div
            style={{
              height: "100%",
              width: `${(parseFloat(album.avg) / 10) * 100}%`,
              backgroundColor: scoreColor(album.avg),
              boxShadow: parseFloat(album.avg) >= 7
                ? `0 0 6px ${scoreColor(album.avg)}`
                : "none",
              transition: "width 0.4s ease",
            }}
          />
        )}
      </div>

      {/* 정보 */}
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-1">
          <p
            style={{ color: "var(--text)", fontWeight: 500, fontSize: 13 }}
            className="truncate leading-snug"
          >
            {album.title}
          </p>
          {album.avg && (
            <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {album.avg}
            </span>
          )}
        </div>
        <p style={{ color: "var(--text-sub)", fontSize: 12 }} className="truncate mt-0.5">
          {album.artist}
        </p>

        {/* 유저별 평점 + Spotify attribution */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {USERS.map((user) => {
              const r = album.ratings.find((rt) => rt.user_id === user.id);
              if (!r) return null;
              return (
                <span
                  key={user.id}
                  style={{ fontSize: 11, color: scoreColor(r.score) }}
                >
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
