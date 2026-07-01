"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UsersContext";
import { scoreColor } from "@/lib/score";
import type { ReviewItem } from "@/app/api/reviews/route";
import AlbumModal from "@/components/album/AlbumModal";
import ReportModal from "@/components/ui/ReportModal";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import Spinner from "@/components/ui/Spinner";
import UserAvatar from "@/components/ui/UserAvatar";
import { apiFetch } from "@/lib/apiFetch";
import FilterSelect from "@/components/ui/FilterSelect";
import { useToast } from "@/components/ui/Toast";
import { useBlockedAction } from "@/hooks/useBlockedAction";

type AlbumModalData = {
  id: string; title: string; artist: string; artist_display?: string;
  release_date?: string; genre?: string;
  cover_url?: string; spotify_id?: string;
  ratings: []; avg?: string;
};

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const PAGE_SIZE = 20;

// ── 공감 베스트 소감 ──────────────────────────────────────────────────────────

function BestReviewCard({
  item, myId, liking, onAlbumClick, onLike, avatarUrl, userName,
}: {
  item: ReviewItem;
  myId: string | null;
  liking: boolean;
  onAlbumClick: () => void;
  onLike: () => void;
  avatarUrl: string | null;
  userName: string;
}) {
  const [imgError, setImgError] = useState(false);
  const iLiked = myId ? item.likedBy.includes(myId) : false;
  const isMyReview = myId === item.userId;

  return (
    <div style={{
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <button
        onClick={onAlbumClick}
        style={{ display: "flex", gap: 10, alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", width: "100%" }}
        className="hover:opacity-75 transition-opacity"
      >
        {item.coverUrl && !imgError ? (
          <div style={{ position: "relative", width: 44, height: 44, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}>
            <Image fill sizes="44px" src={item.coverUrl} alt={item.albumTitle} style={{ objectFit: "cover" }} onError={() => setImgError(true)} />
          </div>
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "var(--text-muted)", flexShrink: 0 }}>♪</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.albumTitle}</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{item.artistDisplay || item.artist}</p>
        </div>
      </button>

      <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, flex: 1, wordBreak: "keep-all", fontStyle: "italic" }}>
        &ldquo;{item.review}&rdquo;
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            backgroundColor: `${scoreColor(item.score)}22`,
            color: scoreColor(item.score),
            border: `1px solid ${scoreColor(item.score)}44`,
            fontSize: 10, fontWeight: 800, flexShrink: 0,
          }}>{item.score}</span>
          <a href={`/profile/${item.userId}`} style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }} className="hover:opacity-70 transition-opacity">
            <UserAvatar avatarUrl={avatarUrl} size={16} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{userName}</span>
          </a>
        </div>
        {!isMyReview && myId ? (
          <button
            onClick={onLike}
            disabled={liking}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: liking ? "not-allowed" : "pointer",
              color: iLiked ? "var(--accent)" : "var(--text-muted)",
              fontSize: 11, padding: "2px 8px", borderRadius: 20,
              backgroundColor: iLiked ? "rgba(var(--accent-rgb), 0.1)" : "transparent",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            <span style={{ fontSize: 12 }}>{iLiked ? "♥" : "♡"}</span>
            {item.likedBy.length > 0 && <span>{item.likedBy.length}</span>}
          </button>
        ) : item.likedBy.length > 0 ? (
          <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2 }}>♥ {item.likedBy.length}</span>
        ) : null}
      </div>
    </div>
  );
}

function BestReviewsSection({
  items, myId, liking, onAlbumClick, onLike, avatarMap, users,
}: {
  items: ReviewItem[];
  myId: string | null;
  liking: string | null;
  onAlbumClick: (albumId: string, albumTitle: string, artist: string, artistDisplay: string, coverUrl: string | null) => void;
  onLike: (item: ReviewItem) => void;
  avatarMap: Record<string, string | null>;
  users: { id: string; display_name: string }[];
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>공감 베스트 소감</p>
        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>♥ 공감수 기준</span>
      </div>
      {items.length === 0 ? (
        <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: "28px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>소감에 공감을 남기면 베스트 소감이 선정돼요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <BestReviewCard
              key={`${item.albumId}-${item.userId}`}
              item={item}
              myId={myId}
              liking={liking === `${item.albumId}-${item.userId}`}
              onAlbumClick={() => onAlbumClick(item.albumId, item.albumTitle, item.artist, item.artistDisplay, item.coverUrl)}
              onLike={() => onLike(item)}
              avatarUrl={avatarMap[item.userId] ?? null}
              userName={users.find((u) => u.id === item.userId)?.display_name ?? item.userId}
            />
          ))}
        </div>
      )}
      <div style={{ height: 1, backgroundColor: "var(--border)", margin: "24px 0 0" }} />
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ReviewsClient({ bestReviews = [] }: { bestReviews?: ReviewItem[] }) {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { users, getUserById } = useUsers();
  const avatarMap = useUserAvatars();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [bestItems, setBestItems] = useState<ReviewItem[]>(bestReviews);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const initAlbumId = searchParams.get("albumId") ?? "";
  const initUserId = searchParams.get("userId") ?? "";
  const [filterUser, setFilterUser] = useState(initUserId);
  const [filterAlbumId, setFilterAlbumId] = useState(initAlbumId);
  const [highlightActive, setHighlightActive] = useState(false);
  const [filterAlbumTitle, setFilterAlbumTitle] = useState("");
  const [filterReview, setFilterReview] = useState("");
  const [minScore, setMinScore] = useState(1);
  const [maxScore, setMaxScore] = useState(8);
  const [sort, setSort] = useState("latest");
  const reviewSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedAlbum, setSelectedAlbum] = useState<AlbumModalData | null>(null);
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);
  const [liking, setLiking] = useState<string | null>(null);
  const [reportingReview, setReportingReview] = useState<{ userId: string; albumTitle: string; review: string } | null>(null);

  const fetchReviews = useCallback(async (params: {
    userId: string; albumId: string; search: string;
    minScore: number; maxScore: number; sort: string; page: number;
  }) => {
    setLoading(true);
    const q = new URLSearchParams();
    if (params.userId) q.set("userId", params.userId);
    if (params.albumId) q.set("albumId", params.albumId);
    if (params.search) q.set("search", params.search);
    q.set("minScore", String(params.minScore));
    q.set("maxScore", String(params.maxScore));
    q.set("sort", params.sort);
    q.set("offset", String((params.page - 1) * PAGE_SIZE));
    try {
      const res = await fetch(`/api/reviews?${q}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items);
      setHasMore(data.hasMore);
      setFetchError(false);
    } catch {
      setItems([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: filterReview, minScore, maxScore, sort, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevSearchRef = useRef({ albumId: initAlbumId, userId: initUserId });
  useEffect(() => {
    const prev = prevSearchRef.current;
    if (initAlbumId !== prev.albumId || initUserId !== prev.userId) {
      prevSearchRef.current = { albumId: initAlbumId, userId: initUserId };
      setFilterAlbumId(initAlbumId);
      setFilterUser(initUserId);
      setFilterReview("");
      setPage(1);
      fetchReviews({ userId: initUserId, albumId: initAlbumId, search: "", minScore: 1, maxScore: 8, sort: "latest", page: 1 });
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (initAlbumId) {
        setHighlightActive(true);
        setTimeout(() => setHighlightActive(false), 2000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAlbumId, initUserId]);

  useEffect(() => {
    if (filterAlbumId && !filterAlbumTitle && items.length > 0) {
      const match = items.find((i) => i.albumId === filterAlbumId);
      if (match) setFilterAlbumTitle(match.albumTitle);
    }
  }, [items, filterAlbumId, filterAlbumTitle]);

  const handleFilter = (u: string, aid: string, mn: number, mx: number, s: string, rev?: string) => {
    const reviewVal = rev !== undefined ? rev : filterReview;
    setFilterUser(u); setFilterAlbumId(aid); setMinScore(mn); setMaxScore(mx); setSort(s);
    setPage(1);
    fetchReviews({ userId: u, albumId: aid, search: reviewVal, minScore: mn, maxScore: mx, sort: s, page: 1 });
  };

  const handleReviewSearch = (val: string) => {
    setFilterReview(val);
    if (reviewSearchTimer.current) clearTimeout(reviewSearchTimer.current);
    reviewSearchTimer.current = setTimeout(() => {
      setPage(1);
      fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: val, minScore, maxScore, sort, page: 1 });
    }, 350);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: filterReview, minScore, maxScore, sort, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyLikeUpdate = useCallback((albumId: string, userId: string, newLikedBy: string[]) => {
    const updater = (prev: ReviewItem[]) =>
      prev.map((r) => r.albumId === albumId && r.userId === userId ? { ...r, likedBy: newLikedBy } : r);
    setItems(updater);
    setBestItems(updater);
  }, []);

  const handleLike = async (item: ReviewItem) => {
    if (!profile) { showToast("로그인 후 공감할 수 있어요"); return; }
    const key = `${item.albumId}-${item.userId}`;
    setLiking(key);
    const iLiked = item.likedBy.includes(profile.id);
    const optimisticLikedBy = iLiked
      ? item.likedBy.filter((id) => id !== profile.id)
      : [...item.likedBy, profile.id];
    applyLikeUpdate(item.albumId, item.userId, optimisticLikedBy);
    try {
      const res = await apiFetch("/api/ratings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: item.albumId, reviewerId: item.userId }),
      });
      if (res.ok) {
        const data = await res.json();
        const newLikedBy = data.liked_by ? data.liked_by.split(",").filter(Boolean) : [];
        applyLikeUpdate(item.albumId, item.userId, newLikedBy);
      } else {
        applyLikeUpdate(item.albumId, item.userId, item.likedBy);
      }
    } catch {
      applyLikeUpdate(item.albumId, item.userId, item.likedBy);
    } finally {
      setLiking(null);
    }
  };

  const handleAlbumClick = async (albumId: string, albumTitle: string, artist: string, artistDisplay: string, coverUrl: string | null) => {
    setLoadingAlbumId(albumId);
    const res = await fetch(`/api/albums/${albumId}`);
    if (!res.ok) { setLoadingAlbumId(null); return; }
    const d = await res.json();
    setSelectedAlbum({
      id: albumId, title: albumTitle, artist, artist_display: artistDisplay ?? undefined,
      release_date: d.release_date ?? undefined, genre: d.genre ?? undefined,
      cover_url: coverUrl ?? undefined, spotify_id: d.spotify_id ?? undefined,
      ratings: d.ratings ?? [], avg: d.avg ?? undefined,
    });
    setLoadingAlbumId(null);
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
    setFilterReview("");
    if (reviewSearchTimer.current) clearTimeout(reviewSearchTimer.current);
    setPage(1);
    handleFilter("", "", 1, 8, "latest", "");
  };

  const isGroupedView = sort === "latest" && filterUser === "" && filterAlbumId === "";

  const albumGroups = useMemo(() => {
    if (!isGroupedView) return [];
    const map = new Map<string, ReviewItem[]>();
    for (const item of items) {
      const group = map.get(item.albumId) ?? [];
      group.push(item);
      map.set(item.albumId, group);
    }
    return [...map.entries()].map(([, reviews]) => reviews);
  }, [items, isGroupedView]);

  const isFiltered = filterUser !== "" || filterAlbumId !== "" || filterReview !== "" || minScore !== 1 || maxScore !== 8 || sort !== "latest";

  return (
    <div data-tour="reviews-main" {...(loading ? { "data-tour-wait": "true" } : {})}>

      {/* 공감 베스트 소감 — 필터 없을 때 항상 표시 */}
      {!isFiltered && (
        <BestReviewsSection
          items={bestItems}
          myId={profile?.id ?? null}
          liking={liking}
          onAlbumClick={handleAlbumClick}
          onLike={handleLike}
          avatarMap={avatarMap}
          users={users}
        />
      )}

      {/* 앨범 필터 배지 */}
      {filterAlbumTitle && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, justifyContent: "flex-end" }}>
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

      {/* 필터 바 — 우측 정렬 */}
      <div data-tour="reviews-filter" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, alignItems: "center", justifyContent: "flex-end" }}>
        <div
          className="min-h-[36px] sm:min-h-0"
          style={{
            display: "flex", alignItems: "center", borderRadius: 6, overflow: "hidden",
            border: `1px solid ${filterReview !== "" ? "var(--accent)" : "var(--border)"}`,
            backgroundColor: filterReview !== "" ? "rgba(var(--accent-rgb), 0.07)" : "var(--bg-elevated)",
            transition: "border-color 0.15s, background-color 0.15s",
            paddingLeft: 8, paddingRight: filterReview ? 4 : 8,
          }}
        >
          <input
            type="text"
            value={filterReview}
            onChange={(e) => handleReviewSearch(e.target.value)}
            placeholder="소감 검색…"
            style={{
              background: "none", border: "none", outline: "none",
              color: "var(--text)", fontSize: 12, padding: "6px 0",
              width: filterReview ? 110 : 80, minWidth: 0,
              transition: "width 0.2s",
            }}
          />
          {filterReview && (
            <button
              onClick={() => { setFilterReview(""); handleReviewSearch(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "0 4px", lineHeight: 1 }}
            >×</button>
          )}
        </div>

        <FilterSelect
          value={filterUser}
          onChange={(v) => handleFilter(v, filterAlbumId, minScore, maxScore, sort)}
          options={[
            { value: "", label: "전체 멤버" },
            ...users.map((u) => ({ value: u.id, label: u.display_name })),
          ]}
          title="멤버"
          feature="청음평_멤버필터"
          active={filterUser !== ""}
          className="min-h-[36px] sm:min-h-0"
        />

        <FilterSelect
          value={minScore}
          onChange={(v) => handleFilter(filterUser, filterAlbumId, Number(v), maxScore, sort)}
          options={SCORE_OPTIONS.map((s) => ({ value: s, label: `${s}점 이상` }))}
          title="최소 점수"
          feature="청음평_최소점수"
          active={minScore !== 1}
          className="min-h-[36px] sm:min-h-0"
        />
        <FilterSelect
          value={maxScore}
          onChange={(v) => handleFilter(filterUser, filterAlbumId, minScore, Number(v), sort)}
          options={SCORE_OPTIONS.map((s) => ({ value: s, label: `${s}점 이하` }))}
          title="최대 점수"
          feature="청음평_최대점수"
          active={maxScore !== 8}
          className="min-h-[36px] sm:min-h-0"
        />

        <FilterSelect
          value={sort}
          onChange={(v) => handleFilter(filterUser, filterAlbumId, minScore, maxScore, v)}
          options={[
            { value: "latest", label: "최신순" },
            { value: "most_liked", label: "공감 많은순" },
          ]}
          title="정렬"
          feature="청음평_정렬"
          active={sort !== "latest"}
          className="min-h-[36px] sm:min-h-0"
        />

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
      <style>{`@keyframes reviewHighlight { 0%{box-shadow:0 0 0 2px var(--accent)} 60%{box-shadow:0 0 0 2px var(--accent)} 100%{box-shadow:none} }`}</style>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={22} /></div>
      ) : fetchError ? (
        <div style={{ textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>불러오지 못했어요</p>
          <button
            onClick={() => fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: filterReview, minScore, maxScore, sort, page })}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-sub)", fontSize: 13, cursor: "pointer" }}
          >
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>아직 소감이 없어요</div>
      ) : isGroupedView ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {albumGroups.map((reviews) => {
            const rep = reviews[0];
            return (
              <div key={rep.albumId} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
                {/* 앨범 헤더 — 1줄 압축 */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", opacity: loadingAlbumId === rep.albumId ? 0.6 : 1, transition: "opacity 0.15s" }}
                  className="hover:bg-[var(--bg-elevated)] transition-colors"
                  onClick={() => !loadingAlbumId && handleAlbumClick(rep.albumId, rep.albumTitle, rep.artist, rep.artistDisplay, rep.coverUrl)}
                >
                  {rep.coverUrl ? (
                    <div style={{ position: "relative", width: 40, height: 40, borderRadius: 5, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}>
                      <Image fill sizes="40px" src={rep.coverUrl} alt={rep.albumTitle} style={{ objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 5, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "var(--text-muted)", flexShrink: 0 }}>♪</div>
                  )}
                  <p style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rep.albumTitle}
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 11 }}> · {rep.artistDisplay || rep.artist}</span>
                  </p>
                  {loadingAlbumId === rep.albumId && <Spinner size={14} />}
                </div>
                {/* 소감 목록 */}
                {reviews.map((item, idx) => {
                  const key = `${item.albumId}-${item.userId}`;
                  return (
                    <ReviewRow
                      key={key}
                      item={item}
                      myId={profile?.id ?? null}
                      liking={liking === key}
                      onLike={() => handleLike(item)}
                      onAlbumClick={() => handleAlbumClick(item.albumId, item.albumTitle, item.artist, item.artistDisplay, item.coverUrl)}
                      onFilterByAlbum={() => handleFilterByAlbum(item.albumId, item.albumTitle)}
                      onReport={() => setReportingReview({ userId: item.userId, albumTitle: item.albumTitle, review: item.review })}
                      isLast={idx === reviews.length - 1}
                      hideAlbumInfo
                      loadingAlbum={loadingAlbumId === item.albumId}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--bg-card)",
          animation: highlightActive ? "reviewHighlight 2s ease-out forwards" : "none",
        }}>
          {items.map((item, idx) => {
            const key = `${item.albumId}-${item.userId}`;
            return (
              <ReviewRow
                key={key}
                item={item}
                myId={profile?.id ?? null}
                liking={liking === key}
                onLike={() => handleLike(item)}
                onAlbumClick={() => handleAlbumClick(item.albumId, item.albumTitle, item.artist, item.artistDisplay, item.coverUrl)}
                onFilterByAlbum={() => handleFilterByAlbum(item.albumId, item.albumTitle)}
                onReport={() => setReportingReview({ userId: item.userId, albumTitle: item.albumTitle, review: item.review })}
                isLast={idx === items.length - 1}
                loadingAlbum={loadingAlbumId === item.albumId}
              />
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && !fetchError && items.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 24, paddingBottom: 8 }}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            style={{
              padding: "7px 16px", borderRadius: 7,
              border: "1px solid var(--border)",
              background: "none", cursor: page === 1 ? "not-allowed" : "pointer",
              color: "var(--text-sub)", fontSize: 13,
              opacity: page === 1 ? 0.35 : 1,
              transition: "opacity 0.15s",
            }}
            className={page > 1 ? "hover:border-[var(--border-light)]" : ""}
          >
            ← 이전
          </button>
          <span style={{ color: "var(--text-muted)", fontSize: 13, minWidth: 56, textAlign: "center" }}>
            {page}페이지
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasMore}
            style={{
              padding: "7px 16px", borderRadius: 7,
              border: "1px solid var(--border)",
              background: "none", cursor: !hasMore ? "not-allowed" : "pointer",
              color: "var(--text-sub)", fontSize: 13,
              opacity: !hasMore ? 0.35 : 1,
              transition: "opacity 0.15s",
            }}
            className={hasMore ? "hover:border-[var(--border-light)]" : ""}
          >
            다음 →
          </button>
        </div>
      )}

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} source="reviews" />
      )}
      {reportingReview && (
        <ReportModal
          onClose={() => setReportingReview(null)}
          defaultUserId={reportingReview.userId}
          defaultDetail={`[${reportingReview.albumTitle}] "${reportingReview.review}"`}
        />
      )}
    </div>
  );
}

// ── ReviewRow ────────────────────────────────────────────────────────────────

function ReviewRow({
  item, myId, liking,
  onLike, onAlbumClick, onFilterByAlbum, onReport, isLast, hideAlbumInfo, loadingAlbum,
}: {
  item: ReviewItem;
  myId: string | null;
  liking: boolean;
  onLike: () => void;
  onAlbumClick: () => void;
  onFilterByAlbum: () => void;
  onReport?: () => void;
  isLast: boolean;
  hideAlbumInfo?: boolean;
  loadingAlbum?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const avatarMap = useUserAvatars();
  const { getUserById } = useUsers();
  const { triggerBlock, shakeStyle } = useBlockedAction();
  const user = getUserById(item.userId);
  const iLiked = myId ? item.likedBy.includes(myId) : false;
  const isMyReview = myId === item.userId;

  const date = new Date(item.updatedAt);
  const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      <div
        style={{ padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, transition: "background 0.12s" }}
        className="hover:bg-[var(--bg-elevated)]"
      >
        {!hideAlbumInfo && (
          <button
            onClick={onAlbumClick}
            style={{ position: "relative", flexShrink: 0, width: 44, height: 44, borderRadius: 6, overflow: "hidden", background: "var(--bg-elevated)", border: "1px solid var(--border)", cursor: "pointer", padding: 0 }}
            className="hover:opacity-75 transition-opacity"
            disabled={!!loadingAlbum}
          >
            {item.coverUrl && !imgError
              ? <Image fill sizes="44px" src={item.coverUrl} alt={item.albumTitle} style={{ objectFit: "cover" }} onError={() => setImgError(true)} />
              : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 14, color: "var(--text-muted)" }}>♪</span>
            }
            {loadingAlbum && (
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spinner size={14} />
              </div>
            )}
          </button>
        )}

        <span style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: scoreColor(String(item.score)) + "22",
          color: scoreColor(String(item.score)),
          fontSize: 11, fontWeight: 800,
        }}>
          {item.score}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            onClick={() => setExpanded(v => !v)}
            style={{
              fontSize: 13, color: "var(--text)", fontWeight: 500,
              marginBottom: hideAlbumInfo ? 0 : 3, lineHeight: 1.45,
              cursor: "pointer",
              ...(expanded
                ? { whiteSpace: "normal" }
                : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
            }}
          >
            {item.review}
          </p>
          {!hideAlbumInfo && (
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
          )}
        </div>

        <div data-tour="reviews-reactions" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={`/profile/${item.userId}`}
            style={{ display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}
            className="hover:opacity-70 transition-opacity"
          >
            <UserAvatar avatarUrl={user ? avatarMap[user.id] : null} size={18} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }} className="max-w-[48px] truncate">
              {user?.display_name ?? item.userId}
            </span>
          </a>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }} className="hidden sm:inline">{dateStr}</span>

          {!isMyReview ? (
            myId ? (
              <button
                onClick={onLike}
                disabled={liking}
                className="min-h-[36px] sm:min-h-0"
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: "none", border: "none", cursor: liking ? "not-allowed" : "pointer",
                  color: iLiked ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 10, padding: "2px 6px", borderRadius: 20,
                  backgroundColor: iLiked ? "rgba(var(--accent-rgb), 0.1)" : "transparent",
                  transition: "background-color 0.15s, color 0.15s",
                }}
              >
                <span style={{ fontSize: 11 }}>{iLiked ? "♥" : "♡"}</span>
                {item.likedBy.length > 0 && <span>{item.likedBy.length}</span>}
              </button>
            ) : (
              <button
                onClick={triggerBlock}
                className="min-h-[36px] sm:min-h-0 opacity-30 hover:opacity-60 transition-opacity"
                style={{
                  display: "flex", alignItems: "center", gap: 3,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: 10, padding: "2px 6px", borderRadius: 20,
                  ...shakeStyle,
                }}
              >
                <span style={{ fontSize: 11 }}>♡</span>
                {item.likedBy.length > 0 && <span>{item.likedBy.length}</span>}
              </button>
            )
          ) : item.likedBy.length > 0 ? (
            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2 }}>
              <span>♥</span><span>{item.likedBy.length}</span>
            </span>
          ) : null}

          {!isMyReview && myId && onReport && (
            <button
              onClick={onReport}
              title="소감 신고"
              className="min-h-[36px] sm:min-h-0 hover:text-[var(--error)] transition-colors"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 10, padding: "2px 4px",
                opacity: 0.5,
              }}
            >
              ⚑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
