"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import { scoreColor } from "@/lib/score";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";
import UserAvatar from "@/components/ui/UserAvatar";
import Link from "next/link";

type FeedItem = {
  user_id: string;
  display_name: string;
  emoji: string | null;
  avatar_url: string | null;
  score: number;
  one_line_review: string | null;
  updated_at: string;
  album_id: string;
  album_title: string;
  album_artist_display: string;
  album_cover_url: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function SocialFeed({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  const isOwnProfile = profile?.id === userId;

  useEffect(() => {
    if (!isOwnProfile) return;
    apiFetch("/api/follows/feed")
      .then((r) => r.json())
      .then((data) => {
        setFeed(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOwnProfile]);

  if (!isOwnProfile) return null;

  return (
    <>
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 14 }}>
          팔로우 피드
        </p>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-shimmer" style={{ height: 52, borderRadius: 8 }} />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            팔로우한 멤버의 최근 청음이 여기에 나타나요
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {feed.map((item, i) => (
              <div
                key={`${item.user_id}-${item.album_id}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: i < feed.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* 아바타 */}
                <Link href={`/profile/${item.user_id}`} style={{ flexShrink: 0, textDecoration: "none" }}>
                  <UserAvatar avatarUrl={item.avatar_url} size={28} />
                </Link>

                {/* 내용 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
                    <Link
                      href={`/profile/${item.user_id}`}
                      style={{ color: "var(--text-sub)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                      className="hover:text-[var(--text)] transition-colors"
                    >
                      {item.display_name}
                    </Link>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>·</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{timeAgo(item.updated_at)}</span>
                  </div>
                  <div
                    onClick={() => setSelectedAlbum({
                      id: item.album_id,
                      title: item.album_title,
                      artist: item.album_artist_display,
                      cover_url: item.album_cover_url ?? undefined,
                      ratings: [],
                    })}
                    style={{ marginTop: 3, cursor: "pointer" }}
                    className="hover:opacity-75 transition-opacity"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {item.album_cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.album_cover_url}
                          alt={item.album_title}
                          style={{ width: 30, height: 30, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{ color: scoreColor(item.score), fontWeight: 700, marginRight: 5 }}>{item.score}점</span>
                          {item.album_title}
                        </p>
                        {item.one_line_review && (
                          <p style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                            &ldquo;{item.one_line_review}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} source="social_feed" />
      )}
    </>
  );
}
