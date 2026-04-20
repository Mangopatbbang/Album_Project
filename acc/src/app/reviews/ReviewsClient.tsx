"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";
import type { ReviewItem } from "@/app/api/reviews/route";
import AlbumModal from "@/components/album/AlbumModal";

type AlbumModalData = {
  id: string; title: string; artist: string; artist_display: string;
  year?: string; release_date: string | null; genre: string | null;
  cover_url: string | null; spotify_id: string | null; avg: number; count: number; variance: number;
};

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ReviewsClient() {
  const { profile } = useAuth();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [filterUser, setFilterUser] = useState("");
  const [filterAlbumId, setFilterAlbumId] = useState("");
  const [filterAlbumTitle, setFilterAlbumTitle] = useState("");
  const [minScore, setMinScore] = useState(1);
  const [maxScore, setMaxScore] = useState(8);
  const [sort, setSort] = useState("latest");

  const [selectedAlbum, setSelectedAlbum] = useState<AlbumModalData | null>(null);
  const [liking, setLiking] = useState<string | null>(null);

  const fetchReviews = useCallback(async (params: {
    userId: string; albumId: string; minScore: number; maxScore: number; sort: string; offset: number;
  }, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    const q = new URLSearchParams();
    if (params.userId) q.set("userId", params.userId);
    if (params.albumId) q.set("albumId", params.albumId);
    q.set("minScore", String(params.minScore));
    q.set("maxScore", String(params.maxScore));
    q.set("sort", params.sort);
    q.set("offset", String(params.offset));
    try {
      const res = await fetch(`/api/reviews?${q}`);
      const data = await res.json();
      setItems((prev) => append ? [...prev, ...data.items] : data.items);
      setHasMore(data.hasMore);
      setOffset(params.offset + data.items.length);
    } finally {
      if (!append) setLoading(false); else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews({ userId: filterUser, albumId: filterAlbumId, minScore, maxScore, sort, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (u: string, aid: string, mn: number, mx: number, s: string) => {
    setFilterUser(u); setFilterAlbumId(aid); setMinScore(mn); setMaxScore(mx); setSort(s);
    fetchReviews({ userId: u, albumId: aid, minScore: mn, maxScore: mx, sort: s, offset: 0 });
    setOffset(0);
  };

  const handleLike = async (item: ReviewItem) => {
    if (!profile) return;
    const key = `${item.albumId}-${item.userId}`;
    setLiking(key);
    try {
      const res = await fetch("/api/ratings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: item.albumId, reviewerId: item.userId, likerId: profile.id }),
      });
      const data = await res.json();
      if (res.ok) {
        const newLikedBy = data.liked_by ? data.liked_by.split(",").filter(Boolean) : [];
        setItems((prev) => prev.map((r) =>
          r.albumId === item.albumId && r.userId === item.userId ? { ...r, likedBy: newLikedBy } : r
        ));
      }
    } finally {
      setLiking(null);
    }
  };

  const handleAlbumClick = async (albumId: string, albumTitle: string, artist: string, artistDisplay: string, coverUrl: string | null) => {
    const res = await fetch(`/api/albums/${albumId}`);
    if (!res.ok) return;
    const d = await res.json();
    setSelectedAlbum({
      id: albumId, title: albumTitle, artist, artist_display: artistDisplay,
      year: d.year ?? undefined, release_date: d.release_date ?? null, genre: d.genre ?? null,
      cover_url: coverUrl, spotify_id: d.spotify_id ?? null,
      avg: parseFloat(d.avg ?? "0"), count: d.ratings?.length ?? 0, variance: 0,
    });
  };

  const handleFilterByAlbum = (albumId: string, albumTitle: string) => {
    setFilterAlbumId(albumId);
    setFilterAlbumTitle(albumTitle);
    handleFilter(filterUser, albumId, minScore, maxScore, sort);
  };

  const clearAlbumFilter = () => {
    setFilterAlbumId("");
    setFilterAlbumTitle("");
    handleFilter(filterUser, "", minScore, maxScore, sort);
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
    color: "var(--text)", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 80px" }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>REVIEWS</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em" }}>소감첩</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>청음사 멤버들의 한줄 소감 모음</p>
      </div>

      {/* 앨범 필터 배지 */}
      {filterAlbumTitle && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>앨범 필터:</span>
          <span style={{
            fontSize: 12, color: "var(--accent)", backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--accent)", borderRadius: 20, padding: "3px 10px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {filterAlbumTitle}
            <button onClick={clearAlbumFilter} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
          </span>
        </div>
      )}

      {/* 필터 바 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <select style={selectStyle} value={filterUser} onChange={(e) => handleFilter(e.target.value, filterAlbumId, minScore, maxScore, sort)}>
          <option value="">전체 멤버</option>
          {USERS.map((u) => <option key={u.id} value={u.id}>{u.emoji} {u.display_name}</option>)}
        </select>

        <select style={selectStyle} value={minScore} onChange={(e) => handleFilter(filterUser, filterAlbumId, Number(e.target.value), maxScore, sort)}>
          {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{s}점 이상</option>)}
        </select>
        <select style={selectStyle} value={maxScore} onChange={(e) => handleFilter(filterUser, filterAlbumId, minScore, Number(e.target.value), sort)}>
          {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{s}점 이하</option>)}
        </select>

        <select style={selectStyle} value={sort} onChange={(e) => handleFilter(filterUser, filterAlbumId, minScore, maxScore, e.target.value)}>
          <option value="latest">최신순</option>
          <option value="most_liked">공감 많은순</option>
        </select>
      </div>

      {/* 피드 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>불러오는 중…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>소감이 없습니다</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => (
            <ReviewCard
              key={`${item.albumId}-${item.userId}`}
              item={item}
              myId={profile?.id ?? null}
              liking={liking === `${item.albumId}-${item.userId}`}
              onLike={() => handleLike(item)}
              onAlbumClick={() => handleAlbumClick(item.albumId, item.albumTitle, item.artist, item.artistDisplay, item.coverUrl)}
              onFilterByAlbum={() => handleFilterByAlbum(item.albumId, item.albumTitle)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => fetchReviews({ userId: filterUser, albumId: filterAlbumId, minScore, maxScore, sort, offset }, true)}
            disabled={loadingMore}
            style={{
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-muted)", borderRadius: 8, padding: "10px 24px", fontSize: 13,
              cursor: loadingMore ? "not-allowed" : "pointer", opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? "불러오는 중…" : "더 보기"}
          </button>
        </div>
      )}

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
        />
      )}
    </div>
  );
}

function ReviewCard({
  item, myId, liking, onLike, onAlbumClick, onFilterByAlbum,
}: {
  item: ReviewItem;
  myId: string | null;
  liking: boolean;
  onLike: () => void;
  onAlbumClick: () => void;
  onFilterByAlbum: () => void;
}) {
  const user = USERS.find((u) => u.id === item.userId);
  const iLiked = myId ? item.likedBy.includes(myId) : false;
  const likedUsers = USERS.filter((u) => item.likedBy.includes(u.id));
  const isMyReview = myId === item.userId;

  const date = new Date(item.updatedAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div style={{
      backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: 16, display: "flex", gap: 14,
    }}>
      {/* 앨범 커버 */}
      <button
        onClick={onAlbumClick}
        style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 8, overflow: "hidden", background: "var(--bg-elevated)", border: "none", cursor: "pointer", padding: 0 }}
        className="hover:opacity-80 transition-opacity"
      >
        {item.coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.coverUrl} alt={item.albumTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 20, color: "var(--text-muted)" }}>♪</span>
        }
      </button>

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 앨범 정보 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ minWidth: 0 }}>
            <button onClick={onAlbumClick} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              className="hover:opacity-70 transition-opacity">
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                {item.albumTitle}
              </p>
            </button>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{item.artistDisplay}</p>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(String(item.score)), flexShrink: 0 }}>
            {item.score}
          </span>
        </div>

        {/* 소감 */}
        <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.5, marginBottom: 8 }}>
          &ldquo;{item.review}&rdquo;
        </p>

        {/* 하단: 작성자 + 날짜 + 액션 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* 작성자 */}
            <a href={`/profile/${item.userId}`} style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
              className="hover:opacity-70 transition-opacity">
              <span style={{ fontSize: 12 }}>{user?.emoji ?? "👤"}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{user?.display_name ?? item.userId}</span>
            </a>
            <span style={{ fontSize: 11, color: "var(--border-light)" }}>·</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{dateStr}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* 이 앨범 다른 소감들 */}
            <button
              onClick={onFilterByAlbum}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", padding: 0 }}
              className="hover:opacity-70 transition-opacity"
              title="이 앨범의 다른 소감 보기"
            >
              앨범 소감 모두 보기
            </button>

            {/* 공감 */}
            {!isMyReview && myId && (
              <button
                onClick={onLike}
                disabled={liking}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: liking ? "not-allowed" : "pointer",
                  color: iLiked ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 11, padding: "3px 8px",
                  borderRadius: 20, transition: "all 0.15s",
                  backgroundColor: iLiked ? "rgba(var(--accent-rgb), 0.1)" : "transparent",
                }}
                title={iLiked ? "공감 취소" : "공감하기"}
              >
                <span style={{ fontSize: 13 }}>{iLiked ? "♥" : "♡"}</span>
                {item.likedBy.length > 0 && <span>{item.likedBy.length}</span>}
              </button>
            )}
            {(isMyReview || !myId) && item.likedBy.length > 0 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                <span>♥</span>
                <span>{item.likedBy.length}</span>
              </span>
            )}
          </div>
        </div>

        {/* 공감한 사람들 */}
        {likedUsers.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {likedUsers.map((u) => (
              <span key={u.id} style={{ fontSize: 10, color: "var(--text-muted)", backgroundColor: "var(--bg-elevated)", borderRadius: 10, padding: "1px 6px" }}>
                {u.emoji} {u.display_name}
              </span>
            ))}
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>이 공감했어요</span>
          </div>
        )}
      </div>
    </div>
  );
}
