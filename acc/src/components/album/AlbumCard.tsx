"use client";

import { AlbumWithRatings, USERS } from "@/types";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";

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
        style={{ backgroundColor: "var(--bg-elevated)", aspectRatio: "1/1", position: "relative" }}
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

        {/* 평균 점수 뱃지 */}
        {album.avg && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.75)",
              color: scoreColor(album.avg),
              fontWeight: 700,
              fontSize: 13,
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            {album.avg}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="p-3">
        <p
          style={{ color: "var(--text)", fontWeight: 500, fontSize: 13 }}
          className="truncate leading-snug"
        >
          {album.title}
        </p>
        <p style={{ color: "var(--text-sub)", fontSize: 12 }} className="truncate mt-0.5">
          {album.artist}
        </p>

        {/* 유저별 평점 */}
        {album.ratings.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {USERS.map((user) => {
              const r = album.ratings.find((rt) => rt.user_id === user.id);
              if (!r) return null;
              return (
                <span
                  key={user.id}
                  style={{
                    fontSize: 11,
                    color: scoreColor(r.score),
                  }}
                >
                  {user.emoji}{r.score}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </button>
  );
}
