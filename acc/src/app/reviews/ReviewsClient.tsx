"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";
import type { ReviewItem } from "@/app/api/reviews/route";
import AlbumModal from "@/components/album/AlbumModal";

type AlbumModalData = {
  id: string; title: string; artist: string; artist_display?: string;
  year?: string; release_date?: string; genre?: string;
  cover_url?: string; spotify_id?: string;
  ratings: []; avg?: string;
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
      id: albumId, title: albumTitle, artist, artist_display: artistDisplay ?? undefined,
      year: d.year ?? undefined, release_date: d.release_date ?? undefined, genre: d.genre ?? undefined,
      cover_url: coverUrl ?? undefined, spotify_id: d.spotify_id ?? undefined,
      ratings: d.ratings ?? [], avg: d.avg ?? undefined,
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
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
          {items.map((item, idx) => (
            <ReviewCard
              key={`${item.albumId}-${item.userId}`}
              item={item}
              myId={profile?.id ?? null}
              liking={liking === `${item.albumId}-${item.userId}`}
              onLike={() => handleLike(item)}
              onAlbumClick={() => handleAlbumClick(item.albumId, item.albumTitle, item.artist, item.artistDisplay, item.coverUrl)}
              onFilterByAlbum={() => handleFilterByAlbum(item.albumId, item.albumTitle)}
              isLast={idx === items.length - 1}
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
  item, myId, liking, onLike, onAlbumClick, onFilterByAlbum, isLast,
}: {
  item: ReviewItem;
  myId: string | null;
  liking: boolean;
  onLike: () => void;
  onAlbumClick: () => void;
  onFilterByAlbum: () => void;
  isLast: boolean;
}) {
  const user = USERS.find((u) => u.id === item.userId);
  const iLiked = myId ? item.likedBy.includes(myId) : false;
  const isMyReview = myId === item.userId;

  const date = new Date(item.updatedAt);
  const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        padding: "11px 14px",
        display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {/* 커버 */}
      <button
        onClick={onAlbumClick}
        style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 5, overflow: "hidden", background: "var(--bg-elevated)", border: "1px solid var(--border)", cursor: "pointer", padding: 0 }}
        className="hover:opacity-75 transition-opacity"
      >
        {item.coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.coverUrl} alt={item.albumTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 14, color: "var(--text-muted)" }}>♪</span>
        }
      </button>

      {/* 점수 */}
      <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(String(item.score)), flexShrink: 0, width: 16, textAlign: "center" }}>
        {item.score}
      </span>

      {/* 앨범 + 소감 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 윗줄: 앨범명 · 아티스트 */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 2 }}>
          <button
            onClick={onAlbumClick}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}
            className="hover:opacity-70 transition-opacity"
          >
            {item.albumTitle}
          </button>
          <span style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1 }}>
            {item.artistDisplay}
          </span>
        </div>
        {/* 아랫줄: 소감 */}
        <p style={{ fontSize: 12, color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
          {item.review}
        </p>
      </div>

      {/* 우측: 작성자 · 날짜 · 공감 */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <a
          href={`/profile/${item.userId}`}
          style={{ display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}
          className="hover:opacity-70 transition-opacity"
        >
          <span style={{ fontSize: 11 }}>{user?.emoji ?? "👤"}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }} className="hidden sm:inline">{user?.display_name ?? item.userId}</span>
        </a>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }} className="hidden sm:inline">{dateStr}</span>

        {/* 앨범 소감 필터 */}
        <button
          onClick={onFilterByAlbum}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text-muted)", padding: 0 }}
          className="hover:opacity-70 transition-opacity hidden sm:inline"
          title="이 앨범의 소감 모두 보기"
        >
          모두보기
        </button>

        {/* 공감 */}
        {!isMyReview && myId ? (
          <button
            onClick={onLike}
            disabled={liking}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: liking ? "not-allowed" : "pointer",
              color: iLiked ? "var(--accent)" : "var(--text-muted)",
              fontSize: 10, padding: "2px 6px", borderRadius: 20,
              backgroundColor: iLiked ? "rgba(var(--accent-rgb), 0.1)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 11 }}>{iLiked ? "♥" : "♡"}</span>
            {item.likedBy.length > 0 && <span>{item.likedBy.length}</span>}
          </button>
        ) : item.likedBy.length > 0 ? (
          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2 }}>
            <span>♥</span><span>{item.likedBy.length}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
