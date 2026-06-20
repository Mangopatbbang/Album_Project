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

export default function ReviewsClient() {
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { users, getUserById } = useUsers();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const initAlbumId = searchParams.get("albumId") ?? "";
  const initUserId = searchParams.get("userId") ?? "";
  const [filterUser, setFilterUser] = useState(initUserId);
  const [filterAlbumId, setFilterAlbumId] = useState(initAlbumId);
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

  const sentinelRef = useRef<HTMLDivElement>(null);

  const [appendStartIdx, setAppendStartIdx] = useState<number | null>(null);

  const fetchReviews = useCallback(async (params: {
    userId: string; albumId: string; search: string; minScore: number; maxScore: number; sort: string; offset: number;
  }, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    const q = new URLSearchParams();
    if (params.userId) q.set("userId", params.userId);
    if (params.albumId) q.set("albumId", params.albumId);
    if (params.search) q.set("search", params.search);
    q.set("minScore", String(params.minScore));
    q.set("maxScore", String(params.maxScore));
    q.set("sort", params.sort);
    q.set("offset", String(params.offset));
    try {
      const res = await fetch(`/api/reviews?${q}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (append) {
        setAppendStartIdx(params.offset);
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setAppendStartIdx(null);
        setItems(data.items);
      }
      setHasMore(data.hasMore);
      setOffset(params.offset + data.items.length);
      if (!append) setFetchError(false);
    } catch {
      if (!append) { setItems([]); setFetchError(true); }
    } finally {
      if (!append) setLoading(false); else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: filterReview, minScore, maxScore, sort, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filterAlbumTitle 자동 세팅 (URL로 albumId가 온 경우)
  useEffect(() => {
    if (filterAlbumId && !filterAlbumTitle && items.length > 0) {
      const match = items.find((i) => i.albumId === filterAlbumId);
      if (match) setFilterAlbumTitle(match.albumTitle);
    }
  }, [items, filterAlbumId, filterAlbumTitle]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: filterReview, minScore, maxScore, sort, offset }, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, offset, filterUser, filterAlbumId, filterReview, minScore, maxScore, sort]);

  const handleFilter = (u: string, aid: string, mn: number, mx: number, s: string, rev?: string) => {
    const reviewVal = rev !== undefined ? rev : filterReview;
    setFilterUser(u); setFilterAlbumId(aid); setMinScore(mn); setMaxScore(mx); setSort(s);
    fetchReviews({ userId: u, albumId: aid, search: reviewVal, minScore: mn, maxScore: mx, sort: s, offset: 0 });
    setOffset(0);
  };

  const handleReviewSearch = (val: string) => {
    setFilterReview(val);
    if (reviewSearchTimer.current) clearTimeout(reviewSearchTimer.current);
    reviewSearchTimer.current = setTimeout(() => {
      fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: val, minScore, maxScore, sort, offset: 0 });
      setOffset(0);
      }, 350);
  };

  const handleLike = async (item: ReviewItem) => {
    if (!profile) { showToast("로그인 후 공감할 수 있어요"); return; }
    const key = `${item.albumId}-${item.userId}`;
    setLiking(key);
    // 낙관적 토글
    const iLiked = item.likedBy.includes(profile.id);
    const optimisticLikedBy = iLiked
      ? item.likedBy.filter((id) => id !== profile.id)
      : [...item.likedBy, profile.id];
    setItems((prev) => prev.map((r) =>
      r.albumId === item.albumId && r.userId === item.userId ? { ...r, likedBy: optimisticLikedBy } : r
    ));
    try {
      const res = await apiFetch("/api/ratings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: item.albumId, reviewerId: item.userId }),
      });
      if (res.ok) {
        // 서버 확정값으로 교정 (동시 공감 처리)
        const data = await res.json();
        const newLikedBy = data.liked_by ? data.liked_by.split(",").filter(Boolean) : [];
        setItems((prev) => prev.map((r) =>
          r.albumId === item.albumId && r.userId === item.userId ? { ...r, likedBy: newLikedBy } : r
        ));
      } else {
        // rollback
        setItems((prev) => prev.map((r) =>
          r.albumId === item.albumId && r.userId === item.userId ? { ...r, likedBy: item.likedBy } : r
        ));
      }
    } catch {
      // rollback
      setItems((prev) => prev.map((r) =>
        r.albumId === item.albumId && r.userId === item.userId ? { ...r, likedBy: item.likedBy } : r
      ));
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
    handleFilter("", "", 1, 8, "latest", "");
  };


  // 앨범별 그룹 보기: 기본 정렬 + 유저/앨범 필터 없을 때
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
      <div data-tour="reviews-filter" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, alignItems: "center" }}>
        {/* 소감 검색 */}
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

        {/* 멤버 */}
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

        {/* 점수 범위 */}
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

        {/* 정렬 */}
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
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Spinner size={22} /></div>
      ) : fetchError ? (
        <div style={{ textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>불러오지 못했어요</p>
          <button
            onClick={() => fetchReviews({ userId: filterUser, albumId: filterAlbumId, search: filterReview, minScore, maxScore, sort, offset: 0 })}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-sub)", fontSize: 13, cursor: "pointer" }}
          >
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>아직 소감이 없어요</div>
      ) : isGroupedView ? (
        /* 앨범별 그룹 뷰 */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {albumGroups.map((reviews) => {
            const rep = reviews[0];
            return (
              <div key={rep.albumId} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
                {/* 앨범 헤더 */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", opacity: loadingAlbumId === rep.albumId ? 0.6 : 1, transition: "opacity 0.15s" }}
                  className="hover:bg-[var(--bg-elevated)] transition-colors"
                  onClick={() => !loadingAlbumId && handleAlbumClick(rep.albumId, rep.albumTitle, rep.artist, rep.artistDisplay, rep.coverUrl)}
                >
                  {rep.coverUrl ? (
                    <div style={{ position: "relative", width: 36, height: 36, borderRadius: 5, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border)" }}>
                      <Image fill sizes="36px" src={rep.coverUrl} alt={rep.albumTitle} style={{ objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 5, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)", flexShrink: 0 }}>♪</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rep.albumTitle}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{rep.artistDisplay || rep.artist}</p>
                  </div>
                  {loadingAlbumId === rep.albumId
                    ? <Spinner size={14} />
                    : <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{reviews.length}개의 소감</span>
                  }
                </div>
                {/* 리뷰 목록 */}
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
        /* 기본 평별 플랫 뷰 */
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--bg-card)" }}>
          {items.map((item, idx) => {
            const key = `${item.albumId}-${item.userId}`;
            const isNew = appendStartIdx !== null && idx >= appendStartIdx;
            const newDelay = isNew ? Math.min(idx - appendStartIdx, 8) * 0.04 : 0;
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
                isNew={isNew}
                newDelay={newDelay}
                loadingAlbum={loadingAlbumId === item.albumId}
              />
            );
          })}
        </div>
      )}

      {/* 인피니티 스크롤 센티넬 */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && (
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}><Spinner size={16} /></div>
      )}
      {!hasMore && items.length > 0 && !loading && !loadingMore && (
        <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-muted)", fontSize: 12 }}>모두 불러왔어요</div>
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

function ReviewRow({
  item, myId, liking,
  onLike, onAlbumClick, onFilterByAlbum, onReport, isLast, hideAlbumInfo, isNew, newDelay, loadingAlbum,
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
  isNew?: boolean;
  newDelay?: number;
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
    <div
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        ...(isNew ? { animation: "feedItemIn 0.22s ease-out both", animationDelay: `${newDelay ?? 0}s` } : {}),
      }}
    >
      {/* 메인 행 */}
      <div
        style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, transition: "background 0.12s" }}
        className="hover:bg-[var(--bg-elevated)]"
      >
        {/* 커버 → 앨범 모달 (앨범 정보 숨길 때는 유저 아바타만) */}
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
          <p
            onClick={() => setExpanded(v => !v)}
            style={{
              fontSize: 13, color: "var(--text)", fontWeight: 500,
              marginBottom: hideAlbumInfo ? 0 : 3, lineHeight: 1.4,
              cursor: "pointer",
              ...(expanded
                ? { whiteSpace: "normal" }
                : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
            }}
          >
            {item.review}
          </p>
          {/* 앨범명(클릭→필터) · 아티스트 — 그룹 뷰에서는 숨김 */}
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

        {/* 우측 메타 */}
        <div data-tour="reviews-reactions" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={`/profile/${item.userId}`}
            style={{ display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}
            className="hover:opacity-70 transition-opacity"
          >
            <UserAvatar avatarUrl={user ? avatarMap[user.id] : null} size={16} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }} className="max-w-[48px] truncate">
              {user?.display_name ?? item.userId}
            </span>
          </a>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }} className="hidden sm:inline">{dateStr}</span>

          {/* 공감 */}
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

          {/* 신고 — 타인 소감 + 로그인 상태 */}
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
