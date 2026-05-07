"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UsersContext";
import { scoreColor } from "@/lib/score";
import type { ReviewItem } from "@/app/api/reviews/route";
import type { CommentItem } from "@/app/api/comments/route";
import AlbumModal from "@/components/album/AlbumModal";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import UserAvatar from "@/components/ui/UserAvatar";
import { apiFetch } from "@/lib/apiFetch";

type AlbumModalData = {
  id: string; title: string; artist: string; artist_display?: string;
  year?: string; release_date?: string; genre?: string;
  cover_url?: string; spotify_id?: string;
  ratings: []; avg?: string;
};

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ReviewsClient() {
  const { profile } = useAuth();
  const { users, getUserById } = useUsers();
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

  const sentinelRef = useRef<HTMLDivElement>(null);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommentItem[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchReviews({ userId: filterUser, albumId: filterAlbumId, minScore, maxScore, sort, offset }, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, offset, filterUser, filterAlbumId, minScore, maxScore, sort]);

  const handleFilter = (u: string, aid: string, mn: number, mx: number, s: string) => {
    setFilterUser(u); setFilterAlbumId(aid); setMinScore(mn); setMaxScore(mx); setSort(s);
    fetchReviews({ userId: u, albumId: aid, minScore: mn, maxScore: mx, sort: s, offset: 0 });
    setOffset(0);
    setExpandedKey(null);
  };

  const handleLike = async (item: ReviewItem) => {
    if (!profile) return;
    const key = `${item.albumId}-${item.userId}`;
    setLiking(key);
    try {
      const res = await apiFetch("/api/ratings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: item.albumId, reviewerId: item.userId }),
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

  const handleReset = () => {
    setFilterAlbumId("");
    setFilterAlbumTitle("");
    handleFilter("", "", 1, 8, "latest");
  };

  const fetchComments = async (albumId: string, reviewerId: string) => {
    const key = `${albumId}-${reviewerId}`;
    const res = await fetch(`/api/comments?albumId=${albumId}&reviewerId=${reviewerId}`);
    const data = await res.json();
    setComments((prev) => ({ ...prev, [key]: data.comments ?? [] }));
  };

  const toggleExpand = (key: string, albumId: string, reviewerId: string) => {
    if (expandedKey === key) {
      setExpandedKey(null);
      setCommentInput("");
    } else {
      setExpandedKey(key);
      setCommentInput("");
      if (!comments[key]) fetchComments(albumId, reviewerId);
    }
  };

  const handleComment = async (item: ReviewItem) => {
    if (!profile || !commentInput.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId: item.albumId, reviewerId: item.userId,
          content: commentInput.trim(),
        }),
      });
      if (res.ok) {
        setCommentInput("");
        await fetchComments(item.albumId, item.userId);
        // 댓글 카운트 +1
        setItems((prev) => prev.map((r) =>
          r.albumId === item.albumId && r.userId === item.userId
            ? { ...r, commentCount: (r.commentCount ?? 0) + 1 }
            : r
        ));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFiltered = filterUser !== "" || filterAlbumId !== "" || minScore !== 1 || maxScore !== 8 || sort !== "latest";
  const scoreActive = minScore !== 1 || maxScore !== 8;

  const baseSelect: React.CSSProperties = {
    background: "none", border: "none", color: "var(--text)",
    fontSize: 12, cursor: "pointer", outline: "none", padding: "6px 8px",
  };

  const filterPill = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", borderRadius: 6, overflow: "hidden",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    backgroundColor: active ? "rgba(var(--accent-rgb), 0.07)" : "var(--bg-elevated)",
    transition: "border-color 0.15s, background-color 0.15s",
  });

  return (
    <div>
      {/* 앨범 필터 배지 */}
      {filterAlbumTitle && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <span style={{
            fontSize: 12, color: "var(--accent)", backgroundColor: "rgba(var(--accent-rgb), 0.08)",
            border: "1px solid rgba(var(--accent-rgb), 0.3)", borderRadius: 20, padding: "3px 10px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {filterAlbumTitle}
            <button onClick={clearAlbumFilter} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
          </span>
        </div>
      )}

      {/* 필터 바 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, alignItems: "center" }}>
        {/* 멤버 */}
        <div style={filterPill(filterUser !== "")}>
          <select style={baseSelect} value={filterUser} onChange={(e) => handleFilter(e.target.value, filterAlbumId, minScore, maxScore, sort)}>
            <option value="">전체 멤버</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.emoji} {u.display_name}</option>)}
          </select>
        </div>

        {/* 점수 범위 */}
        <div style={filterPill(scoreActive)}>
          <select style={{ ...baseSelect, paddingRight: 4 }} value={minScore} onChange={(e) => handleFilter(filterUser, filterAlbumId, Number(e.target.value), maxScore, sort)}>
            {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{s}점 이상</option>)}
          </select>
          <span style={{ color: "var(--text-muted)", fontSize: 11, userSelect: "none", flexShrink: 0 }}>–</span>
          <select style={{ ...baseSelect, paddingLeft: 4 }} value={maxScore} onChange={(e) => handleFilter(filterUser, filterAlbumId, minScore, Number(e.target.value), sort)}>
            {SCORE_OPTIONS.map((s) => <option key={s} value={s}>{s}점 이하</option>)}
          </select>
        </div>

        {/* 정렬 */}
        <div style={filterPill(sort !== "latest")}>
          <select style={baseSelect} value={sort} onChange={(e) => handleFilter(filterUser, filterAlbumId, minScore, maxScore, e.target.value)}>
            <option value="latest">최신순</option>
            <option value="most_liked">공감 많은순</option>
          </select>
        </div>

        {/* 초기화 */}
        {isFiltered && (
          <button
            onClick={handleReset}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 11,
              padding: "5px 8px", borderRadius: 6,
              display: "flex", alignItems: "center", gap: 3,
              transition: "color 0.15s",
            }}
            className="hover:text-[var(--text)]"
          >
            ✕ 초기화
          </button>
        )}
      </div>

      {/* 피드 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>불러오는 중…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>아직 소감이 없어요</div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
          {items.map((item, idx) => {
            const key = `${item.albumId}-${item.userId}`;
            return (
              <ReviewRow
                key={key}
                item={item}
                myId={profile?.id ?? null}
                liking={liking === key}
                expanded={expandedKey === key}
                rowComments={comments[key]}
                commentInput={expandedKey === key ? commentInput : ""}
                submitting={submitting}
                onLike={() => handleLike(item)}
                onAlbumClick={() => handleAlbumClick(item.albumId, item.albumTitle, item.artist, item.artistDisplay, item.coverUrl)}
                onFilterByAlbum={() => handleFilterByAlbum(item.albumId, item.albumTitle)}
                onToggleExpand={() => toggleExpand(key, item.albumId, item.userId)}
                onCommentInput={setCommentInput}
                onCommentSubmit={() => handleComment(item)}
                isLast={idx === items.length - 1}
              />
            );
          })}
        </div>
      )}

      {/* 인피니티 스크롤 센티넬 */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>불러오는 중…</div>
      )}
      {!hasMore && items.length > 0 && !loading && !loadingMore && (
        <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-muted)", fontSize: 12 }}>모두 불러왔어요</div>
      )}

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />
      )}
    </div>
  );
}

function ReviewRow({
  item, myId, liking, expanded, rowComments, commentInput, submitting,
  onLike, onAlbumClick, onFilterByAlbum, onToggleExpand, onCommentInput, onCommentSubmit, isLast,
}: {
  item: ReviewItem;
  myId: string | null;
  liking: boolean;
  expanded: boolean;
  rowComments: CommentItem[] | undefined;
  commentInput: string;
  submitting: boolean;
  onLike: () => void;
  onAlbumClick: () => void;
  onFilterByAlbum: () => void;
  onToggleExpand: () => void;
  onCommentInput: (v: string) => void;
  onCommentSubmit: () => void;
  isLast: boolean;
}) {
  const avatarMap = useUserAvatars();
  const { getUserById } = useUsers();
  const user = getUserById(item.userId);
  const iLiked = myId ? item.likedBy.includes(myId) : false;
  const isMyReview = myId === item.userId;
  const commentCount = item.commentCount ?? 0;

  const date = new Date(item.updatedAt);
  const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div style={{ borderBottom: isLast && !expanded ? "none" : "1px solid var(--border)" }}>
      {/* 메인 행 */}
      <div
        style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, transition: "background 0.12s" }}
        className="hover:bg-[var(--bg-elevated)]"
      >
        {/* 커버 → 앨범 모달 */}
        <button
          onClick={onAlbumClick}
          style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 6, overflow: "hidden", background: "var(--bg-elevated)", border: "1px solid var(--border)", cursor: "pointer", padding: 0 }}
          className="hover:opacity-75 transition-opacity"
        >
          {item.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.coverUrl} alt={item.albumTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 14, color: "var(--text-muted)" }}>♪</span>
          }
        </button>

        {/* 점수 pill */}
        <span style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: scoreColor(String(item.score)) + "22",
          color: scoreColor(String(item.score)),
          fontSize: 11, fontWeight: 800,
        }}>
          {item.score}
        </span>

        {/* 소감 + 앨범정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 소감 텍스트 — 메인 */}
          <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3, lineHeight: 1.4 }}>
            {item.review}
          </p>
          {/* 앨범명(클릭→필터) · 아티스트 */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <button
              onClick={onFilterByAlbum}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}
              className="hover:underline"
            >
              {item.albumTitle}
            </button>
            {item.artistDisplay && (
              <span style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1 }}>
                {item.artistDisplay}
              </span>
            )}
          </div>
        </div>

        {/* 우측 메타 */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={`/profile/${item.userId}`}
            style={{ display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}
            className="hover:opacity-70 transition-opacity"
          >
            <UserAvatar avatarUrl={user ? avatarMap[user.id] : null} size={16} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }} className="hidden sm:inline">
              {user?.display_name ?? item.userId}
            </span>
          </a>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }} className="hidden sm:inline">{dateStr}</span>

          {/* 댓글 토글 */}
          <button
            onClick={onToggleExpand}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              color: expanded ? "var(--accent)" : "var(--text-muted)",
              fontSize: 10, padding: "2px 5px", borderRadius: 20,
              backgroundColor: expanded ? "rgba(var(--accent-rgb), 0.1)" : "transparent",
              transition: "all 0.15s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {(commentCount > 0 || (rowComments && rowComments.length > 0)) && (
              <span>{rowComments ? rowComments.length : commentCount}</span>
            )}
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

      {/* 댓글 영역 */}
      {expanded && (
        <div style={{ backgroundColor: "var(--bg-elevated)", borderTop: "1px solid var(--border)", padding: "10px 14px 10px 72px" }}>
          {rowComments === undefined ? (
            <p style={{ fontSize: 11, color: "var(--text-muted)", padding: "6px 0" }}>불러오는 중…</p>
          ) : rowComments.length === 0 && !myId ? (
            <p style={{ fontSize: 11, color: "var(--text-muted)", padding: "6px 0" }}>아직 댓글이 없어요</p>
          ) : (
            <>
              {rowComments.map((c) => {
                const cu = getUserById(c.commenterId);
                const cd = new Date(c.createdAt);
                const cdStr = `${String(cd.getMonth() + 1).padStart(2, "0")}.${String(cd.getDate()).padStart(2, "0")}`;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <UserAvatar avatarUrl={cu ? avatarMap[cu.id] : null} size={14} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-sub)", marginRight: 6 }}>
                        {cu?.display_name ?? c.commenterId}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text)" }}>{c.content}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{cdStr}</span>
                  </div>
                );
              })}

              {myId && (
                <div style={{ display: "flex", gap: 8, marginTop: rowComments.length > 0 ? 8 : 0, paddingTop: rowComments.length > 0 ? 8 : 0, borderTop: rowComments.length > 0 ? "1px solid var(--border)" : "none" }}>
                  <input
                    value={commentInput}
                    onChange={(e) => onCommentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onCommentSubmit(); } }}
                    placeholder="댓글 달기…"
                    maxLength={200}
                    style={{
                      flex: 1, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "var(--text)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={onCommentSubmit}
                    disabled={submitting || !commentInput.trim()}
                    style={{
                      backgroundColor: "var(--accent)", border: "none", borderRadius: 6,
                      padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--bg)",
                      cursor: submitting || !commentInput.trim() ? "not-allowed" : "pointer",
                      opacity: submitting || !commentInput.trim() ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    작성
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
