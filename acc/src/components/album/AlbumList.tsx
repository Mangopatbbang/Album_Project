"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import AlbumCard from "./AlbumCard";
import AlbumAddModal from "./AlbumAddModal";
import { AlbumWithRatings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import { trackSearch, trackFeatureClick } from "@/lib/track";
import FilterSelect from "@/components/ui/FilterSelect";

type Props = {
  initialAlbums: AlbumWithRatings[];
  initialHasMore: boolean;
  initialNextOffset: number | null;
  genres: string[];
};

const BASE_SORT_OPTIONS = [
  { value: "newest", label: "아카이빙 최신순" },
  { value: "oldest", label: "아카이빙 오래된순" },
  { value: "release_desc", label: "발매일 최신순" },
  { value: "release_asc", label: "발매일 오래된순" },
  { value: "avg_desc", label: "평점 높은순" },
  { value: "avg_asc", label: "평점 낮은순" },
  { value: "title", label: "가나다순" },
];

const MY_SORT_OPTIONS = [
  { value: "my_desc", label: "내 평점 높은순" },
  { value: "my_asc", label: "내 평점 낮은순" },
];

export default function AlbumList({
  initialAlbums,
  initialHasMore,
  initialNextOffset,
  genres,
}: Props) {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL params로 초기 필터 지원
  const urlSearch = searchParams.get("search") ?? "";
  const urlGenre = searchParams.get("genre") ?? "";
  const urlScore = searchParams.get("score") ? Number(searchParams.get("score")) : null;
  const urlScoreUserId = searchParams.get("scoreUserId") ?? null;

  const [albums, setAlbums] = useState<AlbumWithRatings[]>(initialAlbums);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const [search, setSearch] = useState(urlSearch);
  const [genre, setGenre] = useState(urlGenre);
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("newest");
  const [unrated, setUnrated] = useState(false);
  const [myScore, setMyScore] = useState<number | null>(urlScore);
  const [scoreUserId, setScoreUserId] = useState<string | null>(urlScoreUserId);
const [filterLoading, setFilterLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // 필터 변경 시 진행 중인 loadMore 응답을 폐기하기 위한 세대 카운터
  const filterGenRef = useRef(0);

  const sortOptions = profile
    ? [...BASE_SORT_OPTIONS, ...MY_SORT_OPTIONS]
    : BASE_SORT_OPTIONS;

  const fetchAlbums = useCallback(
    async (params: { search: string; genre: string; region: string; sort: string; unrated: boolean; myScore: number | null; scoreUserId?: string | null; offset?: number }) => {
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      if (params.genre) q.set("genre", params.genre);
      if (params.region) q.set("region", params.region);
      q.set("sort", params.sort);
      if (params.unrated && profile) {
        q.set("unrated", "true");
        q.set("userId", profile.id);
      }
      if (params.myScore) {
        // scoreUserId가 있으면 해당 유저 기준, 없으면 로그인 유저 기준
        const uid = params.scoreUserId ?? (profile?.id ?? null);
        if (uid) {
          q.set("myScore", String(params.myScore));
          q.set("userId", uid);
        }
      }
      if ((params.sort === "my_desc" || params.sort === "my_asc") && profile) {
        q.set("userId", profile.id);
      }
      if (params.offset) q.set("offset", String(params.offset));

      const res = await fetch(`/api/albums?${q.toString()}`);
      return res.json() as Promise<{
        items: AlbumWithRatings[];
        hasMore: boolean;
        nextOffset: number | null;
      }>;
    },
    [profile]
  );

  const handleFilter = useCallback(
    async (newSearch: string, newGenre: string, newRegion: string, newSort: string, newUnrated: boolean, newMyScore: number | null, newScoreUserId?: string | null) => {
      // 세대 증가로 진행 중인 loadMore 응답을 무효화
      filterGenRef.current += 1;
      setLoading(true);
      setFilterLoading(true);
      try {
        const data = await fetchAlbums({ search: newSearch, genre: newGenre, region: newRegion, sort: newSort, unrated: newUnrated, myScore: newMyScore, scoreUserId: newScoreUserId ?? scoreUserId });
        setAlbums(data.items ?? []);
        setHasMore(data.hasMore ?? false);
        setNextOffset(data.nextOffset ?? null);
        setFetchError(false);
      } catch {
        setAlbums([]);
        setFetchError(true);
      } finally {
        setLoading(false);
        setFilterLoading(false);
      }
    },
    [fetchAlbums, region, scoreUserId]
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const gen = filterGenRef.current;
    setLoading(true);
    try {
      const data = await fetchAlbums({ search, genre, region, sort, unrated, myScore, scoreUserId, offset: nextOffset ?? 0 });
      // 필터가 변경되었으면 이 응답은 구버전 — 무시
      if (filterGenRef.current !== gen) return;
      if (!data.items) return;
      setAlbums((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newItems = data.items.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newItems];
      });
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      // 네트워크 오류 시 현재 목록 유지
    } finally {
      // stale 응답이면 loading 해제를 handleFilter에 맡김
      // (여기서 해제하면 handleFilter 진행 중에 loading=false → loadMore 재발동 위험)
      if (filterGenRef.current === gen) setLoading(false);
    }
  }, [hasMore, loading, fetchAlbums, search, genre, region, sort, unrated, myScore, scoreUserId, nextOffset]);

  // URL params에 초기 필터 적용
  useEffect(() => {
    if (urlSearch) {
      handleFilter(urlSearch, "", "", "newest", false, null);
    } else if (urlGenre) {
      handleFilter("", urlGenre, "", "newest", false, null);
    } else if (urlScore && urlScoreUserId) {
      handleFilter("", "", "", "newest", false, urlScore, urlScoreUserId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 무한 스크롤: sentinel이 뷰포트에 들어오면 자동 로드
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) handleLoadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  // bfcache로 복원될 때 검색어 초기화
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSearch("");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // 앨범 모달에서 평점/삭제 시 로컬 상태 동기화
  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const { albumId, data } = (e as CustomEvent<{ albumId: string; data: AlbumWithRatings }>).detail;
      setAlbums((prev) => prev.map((a) => (a.id === albumId ? { ...data } : a)));
    };
    const handleDeleted = (e: Event) => {
      const { albumId } = (e as CustomEvent<{ albumId: string }>).detail;
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    };
    window.addEventListener("album-updated", handleUpdated);
    window.addEventListener("album-deleted", handleDeleted);
    return () => {
      window.removeEventListener("album-updated", handleUpdated);
      window.removeEventListener("album-deleted", handleDeleted);
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleFilter(val, genre, region, sort, unrated, myScore);
      const q = new URLSearchParams();
      if (val) q.set("search", val);
      router.replace(q.toString() ? `${pathname}?${q.toString()}` : pathname, { scroll: false });
    }, 300);
  };

  const handleGenreChange = (val: string) => {
    const next = genre === val ? "" : val;
    setGenre(next);
    trackFeatureClick("음반고_장르필터", next || "전체");
    window.scrollTo(0, 0);
    handleFilter(search, next, region, sort, unrated, myScore);
  };

  const handleRegionChange = (val: string) => {
    const next = region === val ? "" : val;
    setRegion(next);
    trackFeatureClick("음반고_지역필터", next || "전체");
    window.scrollTo(0, 0);
    handleFilter(search, genre, next, sort, unrated, myScore);
  };

  const handleSortChange = (val: string) => {
    setSort(val);
    window.scrollTo(0, 0);
    handleFilter(search, genre, region, val, unrated, myScore);
  };

  const handleUnratedToggle = () => {
    const next = !unrated;
    const nextSort = next && (sort === "my_desc" || sort === "my_asc") ? "newest" : sort;
    setUnrated(next);
    trackFeatureClick("음반고_미청음", next ? "켜짐" : "꺼짐");
    if (next) setMyScore(null);
    if (nextSort !== sort) setSort(nextSort);
    window.scrollTo(0, 0);
    handleFilter(search, genre, region, nextSort, next, null);
  };

  const handleScoreFilter = (score: number) => {
    const next = myScore === score ? null : score;
    setMyScore(next);
    if (next === null) setScoreUserId(null);
    setUnrated(false);
    window.scrollTo(0, 0);
    handleFilter(search, genre, region, sort, false, next, next === null ? null : scoreUserId);
  };

return (
    <>
      {/* ── 필터 바 ── sticky, 헤더(52px) 바로 아래 */}
      <div
        data-tour="albums-filter"
        className="sticky top-0 sm:top-[52px] z-40 no-scrollbar"
        style={{
          backgroundColor: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          marginBottom: 28,
          paddingTop: 14,
          paddingBottom: 12,
          isolation: "isolate",
        }}
      >
        {/* Row 1: 검색 + 정렬 + 입고 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          {/* 검색창 with icon */}
          <div style={{ position: "relative", flex: "1 1 0", minWidth: 0 }}>
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="제목 / 아티스트 검색"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: 8,
                padding: "7px 12px 7px 32px",
                fontSize: 13,
                width: "100%",
              }}
            />
          </div>

          {/* 정렬 */}
          <FilterSelect
            value={sort}
            onChange={handleSortChange}
            options={sortOptions}
            title="정렬 기준"
            feature="음반고_정렬"
            active={sort !== "newest"}
            style={{ borderRadius: 8, padding: "7px 10px", flexShrink: 0 }}
          />

          {/* 입고 버튼 */}
          {profile && (
            <button
              data-tour="albums-import"
              onClick={() => setShowAddModal(true)}
              style={{
                backgroundColor: "var(--accent)",
                border: "none",
                color: "var(--bg)",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              입고
            </button>
          )}
        </div>

        {/* Row 2(모바일: 장르 줄) + Row 3(모바일: 필터 줄) — flex-wrap으로 자동 분리 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5" style={{ marginBottom: 8 }}>
          {/* 장르 pills — 모바일 전체너비, 데스크탑 flex-1 */}
          <div
            className="no-scrollbar w-full sm:flex-1 sm:min-w-0"
            style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}
          >
            {(["", ...genres] as string[]).map((g) => {
              const label = g === "" ? "전체" : g;
              const isSelected = g === genre;
              return (
                <button
                  key={g}
                  onClick={() => handleGenreChange(g)}
                  className="flex items-center justify-center min-h-[40px] sm:min-h-0"
                  style={{
                    flexShrink: 0,
                    backgroundColor: isSelected ? "var(--accent)" : "var(--bg-card)",
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    color: isSelected ? "var(--bg)" : "var(--text-sub)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "background-color 0.12s, border-color 0.12s, color 0.12s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 구분선 — 데스크탑만 */}
          <div className="hidden sm:block flex-shrink-0" style={{ width: 1, height: 18, backgroundColor: "var(--border)" }} />

          {/* 국내 / 해외 / 미청음만 / 모바일 내평점 — 우측 고정 */}
          <div data-tour="albums-score-filter" style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
            {(["국내", "해외"] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRegionChange(r)}
                className="flex items-center justify-center min-h-[40px] sm:min-h-0"
                style={{
                  backgroundColor: region === r ? "rgba(232,213,163,0.12)" : "transparent",
                  border: `1px solid ${region === r ? "rgba(232,213,163,0.45)" : "var(--border)"}`,
                  color: region === r ? "var(--accent)" : "var(--text-muted)",
                  borderRadius: 6, padding: "4px 9px", fontSize: 11,
                  cursor: "pointer", fontWeight: region === r ? 700 : 400,
                  whiteSpace: "nowrap", transition: "all 0.12s",
                }}
              >{r}</button>
            ))}
            {profile && (
              <button
                onClick={handleUnratedToggle}
                className="flex items-center justify-center min-h-[40px] sm:min-h-0"
                style={{
                  backgroundColor: unrated ? "rgba(232,213,163,0.12)" : "transparent",
                  border: `1px solid ${unrated ? "rgba(232,213,163,0.45)" : "var(--border)"}`,
                  color: unrated ? "var(--accent)" : "var(--text-muted)",
                  borderRadius: 6, padding: "4px 9px", fontSize: 11,
                  cursor: "pointer", fontWeight: unrated ? 700 : 400,
                  whiteSpace: "nowrap", transition: "all 0.12s",
                }}
              >미청음만</button>
            )}
            {/* 내 평점 select (모바일 전용) */}
            {profile && (
              <FilterSelect
                value={myScore ?? ""}
                onChange={(v) => {
                  const val = v ? Number(v) : null;
                  setMyScore(val);
                  if (!val) setScoreUserId(null);
                  setUnrated(false);
                  handleFilter(search, genre, region, sort, false, val, val === null ? null : scoreUserId);
                }}
                options={[
                  { value: "", label: "내 평점" },
                  ...[1,2,3,4,5,6,7,8].map((s) => ({ value: s, label: `${s}점` })),
                ]}
                title="내 평점"
                feature="음반고_내평점필터"
                active={myScore !== null}
                style={{ fontSize: 11, padding: "4px 8px" }}
              />
            )}
          </div>
        </div>

      </div>

      {/* 앨범 그리드 */}
      {filterLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: Math.min(Math.max(albums.length, 6), 20) }).map((_, i) => (
            <div key={i} className="skeleton-shimmer rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div style={{ aspectRatio: "1/1" }} />
              <div style={{ padding: "12px 14px" }}>
                <div style={{ height: 13, width: "70%", borderRadius: 4, backgroundColor: "var(--bg-elevated)", marginBottom: 6 }} />
                <div style={{ height: 11, width: "45%", borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : loading && albums.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Spinner size={22} />
        </div>
      ) : fetchError ? (
        <div className="text-center py-10 sm:py-20 flex flex-col items-center gap-3">
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오지 못했어요</p>
          <button
            onClick={() => handleFilter(search, genre, region, sort, unrated, myScore)}
            style={{
              backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-sub)",
              borderRadius: 6, padding: "7px 16px", fontSize: 13, cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-10 sm:py-20 flex flex-col items-center gap-3">
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>인연 닿는 음반이 없습니다</p>
          {search && profile && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
                borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              &ldquo;{search}&rdquo; 바로 추가하기
            </button>
          )}
          {search && (
            <Link
              href="/board"
              style={{ color: "var(--text-muted)", fontSize: 12 }}
            >
              게시판에서 입고 요청하기 →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {albums.map((album, i) => (
            <div
              key={album.id}
              className={albums.length <= 10 ? "animate-stagger" : ""}
              style={albums.length <= 10 ? { animationDelay: `${i * 0.045}s` } : undefined}
            >
              <AlbumCard album={album} onNavigate={() => { if (search) trackSearch(search, albums.length); }} />
            </div>
          ))}
        </div>
      )}

      {/* 무한 스크롤 sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && albums.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
          <Spinner size={16} />
        </div>
      )}

      {showAddModal && (
        <AlbumAddModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => handleFilter(search, genre, region, sort, unrated, myScore)}
          initialSearch={albums.length === 0 && search ? search : undefined}
        />
      )}
    </>
  );
}
