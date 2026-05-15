"use client";

import { useState } from "react";
import { AlbumWithRatings } from "@/types";
import AlbumModal from "@/components/album/AlbumModal";
import UserAvatar from "@/components/ui/UserAvatar";
import { scoreColor } from "@/lib/score";
import { useUsers } from "@/context/UsersContext";

export type FeedItem = {
  user_id: string;
  score: number;
  one_line_review: string | null;
  updated_at: string;
  album_id: string;
  album_title: string;
  album_artist: string;
  album_artist_display: string;
  album_cover_url: string | null;
  avatar_url?: string | null;
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function HomeRecentFeed({ items }: { items: FeedItem[] }) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);
  const { getUserById } = useUsers();

  const openAlbum = (item: FeedItem) => {
    setSelectedAlbum({
      id: item.album_id,
      title: item.album_title,
      artist: item.album_artist,
      artist_display: item.album_artist_display,
      cover_url: item.album_cover_url ?? undefined,
      ratings: [],
    });
  };

  if (items.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
        아직 평가 기록이 없어요
      </p>
    );
  }

  return (
    <>
      {/* 데스크탑: 2열 그리드 / 모바일: 1열 리스트 */}
      <div className="sm:grid sm:grid-cols-2 sm:gap-x-5">
        {items.map((item, i) => {
          const user = getUserById(item.user_id);
          return (
            <div
              key={i}
              onClick={() => openAlbum(item)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
              className="hover:opacity-75 transition-opacity"
            >
              {/* 앨범 커버 */}
              <div
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 6,
                  overflow: "hidden",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                {item.album_cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.album_cover_url}
                    alt={item.album_title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    ♪
                  </div>
                )}
              </div>

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 유저 + 점수 */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <UserAvatar avatarUrl={item.avatar_url ?? null} size={12} />
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                    {user?.display_name ?? "익명"}
                  </span>
                  <span style={{ color: scoreColor(item.score), fontWeight: 700, fontSize: 11, marginLeft: 2 }}>
                    {item.score}
                  </span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 10, flexShrink: 0, whiteSpace: "nowrap" }}>
                    {relativeTime(item.updated_at)}
                  </span>
                </div>
                {/* 앨범명 */}
                <p style={{ color: "var(--text)", fontWeight: 500, fontSize: 12, lineHeight: 1.3 }} className="truncate">
                  {item.album_title}
                </p>
                {/* 아티스트 */}
                <p style={{ color: "var(--text-sub)", fontSize: 11 }} className="truncate">
                  {item.album_artist_display}
                </p>
                {/* 한줄평 */}
                {item.one_line_review && (
                  <p style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic", marginTop: 2 }} className="truncate">
                    &ldquo;{item.one_line_review}&rdquo;
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          source="home_feed"
        />
      )}
    </>
  );
}
