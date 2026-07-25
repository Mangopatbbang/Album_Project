"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import AlbumCard from "./AlbumCard";
import AlbumAddModal from "./AlbumAddModal";
import { AlbumWithRatings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/context/UsersContext";
import Spinner from "@/components/ui/Spinner";
import { trackSearch, trackFeatureClick } from "@/lib/track";
import FilterSelect from "@/components/ui/FilterSelect";
import AlbumFilterSheet from "./AlbumFilterSheet";
import { useBlockedAction } from "@/hooks/useBlockedAction";

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
  const { triggerBlock } = useBlockedAction();
  const { getUserById } = useUsers();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL params로 초기 필터 지원
  const urlSearch = searchParams.get("search") ?? "";
  const urlGenre = searchParams.get("genre") ?? "";
  const urlScore = searchParams.get("score") ? Number(searchParams.get("score")) : null;
  const urlScoreUserId = searchParams.get("scoreUserId") ?? null;

  // URL 필터 있으면 서버 초기값(무필터) 대신 빈 상태로 시작 — 깜빡임 방지
  const hasUrlFilters = !!(urlSearch || urlGenre || (urlScore && urlScoreUserId));

  const [albums, setAlbums] = useState<AlbumWithRatings[]>(hasUrlFilters ? [] : initialAlbums);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hasMore, setHasMore] = useState(hasUrlFilters ? false : initialHasMore);
  const [nextOffset, setNextOffset] = useState<number | null>(hasUrlFilters ? null : initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const [search, setSearch] = useState(urlSearch);
  const [genre, setGenre] = useState(urlGenre);
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("newest");
  const [unrated, setUnrated] = useState(false);
  const [myScore, setMyScore] = useState<number | null>(urlScore);
  const [scoreUserId, setScoreUserId] = useState<string | null>(urlScoreUserId);
  const [filterLoading, setFilterLoading] = useState(hasUrlFilters);
  const [navigatingAlbumId, setNavigatingAlbumId] = useState<string | null>(null);
  const navigatingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // 필터 변경 시 진행 중인 loadMore 응답을 폐기하기 위한 세대 카운터
  const filterGenRef = useRef(0);
  // 클라이언트 검색 결과 캐시 (세션 내 동일 조건 재검색 즉시 반환)
  const searchCacheRef = useRef(new Map<string, { items: AlbumWithRatings[]; hasMore: boolean; nextOffset: number | null }>());

  const sortOptions = profile
    ? [...BASE_SORT_OPTIONS, ...MY_SORT_OPTIONS]
    : BASE_SORT_OPTIONS;

  const activeFilterCount = [
    genre !== "",
    region !== "",
    sort !== "newest",
    unrated,
    myScore !== null,
  ].filter(Boolean).length;

  const fetchAlbums = useCallback(
    async (params: { search: string; genre: string; region: string; sort: string; unrated: boolean; myScore: number | null; scoreUserId?: string | null; offset?: number; signal?: AbortSignal }) => {
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

      const res = await fetch(`/api/albums?${q.toString()}`, { signal: params.signal });
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
      // 이전 진행 중인 요청 취소 (브라우저 connection slot 즉시 반환)
      fetchControllerRef.current?.abort();
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      // 세대 증가: 진행 중인 loadMore 응답 무효화 (캐시 히트 시에도 필요)
      filterGenRef.current += 1;

      // 클라이언트 캐시 체크 — 모든 필터 조합 키 포함
      const sid = newScoreUserId ?? scoreUserId ?? "";
      const cacheKey = `${newSearch}|${newGenre}|${newRegion}|${newSort}|${newUnrated}|${newMyScore ?? ""}|${sid}`;
      const cached = searchCacheRef.current.get(cacheKey);
      if (cached) {
        setAlbums(cached.items);
        setHasMore(cached.hasMore);
        setNextOffset(cached.nextOffset);
        setFilterLoading(false);
        setFetchError(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFilterLoading(true);
      try {
        const data = await fetchAlbums({ search: newSearch, genre: newGenre, region: newRegion, sort: newSort, unrated: newUnrated, myScore: newMyScore, scoreUserId: newScoreUserId ?? scoreUserId, signal: controller.signal });
        if (controller.signal.aborted) return; // 취소된 요청 결과 무시
        setAlbums(data.items ?? []);
        setHasMore(data.hasMore ?? false);
        setNextOffset(data.nextOffset ?? null);
        setFetchError(false);

        // 캐시 저장 (최대 30 엔트리, LRU-like: 초과 시 가장 오래된 항목 제거)
        if (searchCacheRef.current.size >= 30) {
          const oldest = searchCacheRef.current.keys().next().value;
          if (oldest !== undefined) searchCacheRef.current.delete(oldest);
        }
        searchCacheRef.current.set(cacheKey, {
          items: data.items ?? [],
          hasMore: data.hasMore ?? false,
          nextOffset: data.nextOffset ?? null,
        });
      } catch (e) {
        if (controller.signal.aborted) return; // AbortError — 정상 취소, UI 변경 없음
        setAlbums([]);
        setFetchError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setFilterLoading(false);
        }
      }
    },
    [fetchAlbums, region, scoreUserId]
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const gen = filterGenRef.current;
    setLoading(true);
    setLoadMoreError(false);
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
      if (filterGenRef.current === gen) setLoadMoreError(true);
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

  // 앨범 목록이 확정되면 상위 8개 모달 RSC 프리패치
  // — router.push 시점에 서버 컴포넌트가 이미 실행돼 있으므로 즉시 열림 (모바일 탭 딜레이 해결)
  useEffect(() => {
    if (albums.length === 0 || filterLoading) return;
    albums.slice(0, 8).forEach((a) => router.prefetch(`/album/${a.id}`));
  // router는 stable ref, filterLoading은 fetch 완료 시점 트리거용
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albums, filterLoading]);

  // 모달 네비게이션: pathname이 /album/... 으로 바뀌면 스켈레톤을 모달 애니메이션 후 제거
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname;
      if (navigatingClearRef.current) clearTimeout(navigatingClearRef.current);
      // 모달 backdropIn 0.18s 완료 후 제거 (그 전까지 스켈레톤이 뒤에서 자연스럽게 덮임)
      navigatingClearRef.current = setTimeout(() => setNavigatingAlbumId(null), 220);
    }
  }, [pathname]);

  // bfcache로 복원될 때 검색어 초기화
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSearch("");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // 로그인/로그아웃 시 캐시 초기화 (사용자별 필터 결과 오염 방지)
  useEffect(() => {
    searchCacheRef.current.clear();
  }, [profile?.id]);

  // 앨범 추가 모달 닫힐 때 캐시 초기화 (새 앨범이 검색 결과에 즉시 반영되도록)
  const prevShowAddModalRef = useRef(false);
  useEffect(() => {
    if (prevShowAddModalRef.current && !showAddModal) {
      searchCacheRef.current.clear();
    }
    prevShowAddModalRef.current = showAddModal;
  }, [showAddModal]);

  // 앨범 모달에서 평점/삭제 시 로컬 상태 + 캐시 동기화
  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const { albumId, data } = (e as CustomEvent<{ albumId: string; data: AlbumWithRatings }>).detail;
      setAlbums((prev) => prev.map((a) => (a.id === albumId ? { ...data } : a)));
      // 캐시 엔트리의 해당 앨범도 최신 데이터로 교체
      searchCacheRef.current.forEach((cached, key) => {
        searchCacheRef.current.set(key, {
          ...cached,
          items: cached.items.map((a) => (a.id === albumId ? { ...data } : a)),
        });
      });
    };
    const handleDeleted = (e: Event) => {
      const { albumId } = (e as CustomEvent<{ albumId: string }>).detail;
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      // 해당 앨범이 포함된 캐시 엔트리는 무효화
      searchCacheRef.current.forEach((cached, key) => {
        if (cached.items.some((a) => a.id === albumId)) {
          searchCacheRef.current.delete(key);
        }
      });
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

  const handleReset = () => {
    setGenre("");
    setRegion("");
    setSort("newest");
    setUnrated(false);
    setMyScore(null);
    setScoreUserId(null);
    handleFilter(search, "", "", "newest", false, null, null);
    if (scoreUserId) router.replace(pathname, { scroll: false });
  };

  type Chip = { key: string; label: string; onRemove: () => void };
  const activeChips: Chip[] = [
    ...(genre ? [{ key: "genre", label: genre, onRemove: () => handleGenreChange("") }] : []),
    ...(region ? [{ key: "region", label: region, onRemove: () => handleRegionChange("") }] : []),
    ...(sort !== "newest" ? [{ key: "sort", label: sortOptions.find((o) => o.value === sort)?.label ?? sort, onRemove: () => handleSortChange("newest") }] : []),
    ...(unrated ? [{ key: "unrated", label: "미청음", onRemove: handleUnratedToggle }] : []),
    ...(myScore !== null ? [{
      key: "score",
      label: scoreUserId
        ? `${getUserById(scoreUserId)?.display_name ?? scoreUserId}님의 ${myScore}점`
        : `내 ${myScore}점`,
      onRemove: () => {
        setMyScore(null);
        setScoreUserId(null);
        handleFilter(search, genre, region, sort, unrated, null, null);
        if (scoreUserId) router.replace(pathname, { scroll: false });
      },
    }] : []),
  ];

return (
    <>
      {/* ── 필터 바 ── */}
      <div
        data-tour="albums-filter"
        className="sticky top-0 sm:top-[52px] z-40"
        style={{
          backgroundColor: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          marginBottom: 28,
          isolation: "isolate",
        }}
      >
        {/* ── 모바일 (sm:hidden): 1줄 콤팩트 바 + 활성 필터 칩 ── */}
        <div className="sm:hidden" style={{ paddingTop: 10, paddingBottom: 10 }}>
          {/* 검색 + 필터 버튼 + 입고 */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                  borderRadius: 50,
                  padding: "8px 12px 8px 32px",
                  fontSize: 13,
                  width: "100%",
                }}
              />
            </div>
            {/* 필터 버튼 */}
            <button
              onClick={() => setSheetOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                backgroundColor: activeFilterCount > 0 ? "rgba(232,213,163,0.12)" : "var(--bg-card)",
                border: `1px solid ${activeFilterCount > 0 ? "rgba(232,213,163,0.45)" : "var(--border)"}`,
                color: activeFilterCount > 0 ? "var(--accent)" : "var(--text-muted)",
                borderRadius: 8, padding: "8px 12px",
                fontSize: 13, fontWeight: activeFilterCount > 0 ? 700 : 400,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
              </svg>
              {activeFilterCount > 0 ? `필터 ${activeFilterCount}` : "필터"}
            </button>
            {/* 입고 */}
            <button
              data-tour="albums-import"
              onClick={() => profile ? setShowAddModal(true) : triggerBlock()}
              style={{
                backgroundColor: "var(--accent)",
                border: "none",
                color: "var(--bg)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              입고
            </button>
          </div>

          {/* 활성 필터 칩 */}
          {activeChips.length > 0 && (
            <div
              className="no-scrollbar"
              style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 8, paddingBottom: 2 }}
            >
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    backgroundColor: "rgba(232,213,163,0.1)",
                    border: "1px solid rgba(232,213,163,0.35)",
                    borderRadius: 20, padding: "4px 10px 4px 12px",
                    fontSize: 12, color: "var(--accent)", fontWeight: 600,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  {chip.label}
                  <button
                    onClick={chip.onRemove}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--accent)", fontSize: 13, lineHeight: 1,
                      padding: 0, display: "flex", alignItems: "center",
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 데스크탑 (hidden sm:block): 2줄 필터 바 ── */}
        <div className="hidden sm:block" style={{ paddingTop: 14, paddingBottom: 12 }}>
          {/* Row 1: 검색 + 정렬 + 입고 */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
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
                  borderRadius: 50,
                  padding: "7px 12px 7px 32px",
                  fontSize: 13,
                  width: "100%",
                }}
              />
            </div>
            <FilterSelect
              value={sort}
              onChange={handleSortChange}
              options={sortOptions}
              title="정렬 기준"
              feature="음반고_정렬"
              active={sort !== "newest"}
              style={{ borderRadius: 8, padding: "7px 10px", flexShrink: 0 }}
            />
            <button
              data-tour="albums-import"
              onClick={() => profile ? setShowAddModal(true) : triggerBlock()}
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
          </div>

          {/* Row 2: 장르 + 지역 + 미청음 + 내평점 */}
          <div className="flex items-center gap-x-2" style={{ marginBottom: 8 }}>
            <div
              className="no-scrollbar"
              style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, flex: "1 1 0", minWidth: 0 }}
            >
              {(["", ...genres] as string[]).map((g) => {
                const isSelected = g === genre;
                return (
                  <button
                    key={g}
                    onClick={() => handleGenreChange(g)}
                    style={{
                      flexShrink: 0,
                      backgroundColor: isSelected ? "var(--accent)" : "var(--bg-card)",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                      color: isSelected ? "var(--bg)" : "var(--text-sub)",
                      borderRadius: 20, padding: "4px 12px",
                      fontSize: 12, fontWeight: isSelected ? 700 : 400,
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "background-color 0.12s, border-color 0.12s, color 0.12s",
                    }}
                  >
                    {g === "" ? "전체" : g}
                  </button>
                );
              })}
            </div>
            <div className="flex-shrink-0" style={{ width: 1, height: 18, backgroundColor: "var(--border)" }} />
            <div data-tour="albums-score-filter" style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
              {(["국내", "해외"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRegionChange(r)}
                  style={{
                    backgroundColor: region === r ? "rgba(232,213,163,0.12)" : "transparent",
                    border: `1px solid ${region === r ? "rgba(232,213,163,0.45)" : "var(--border)"}`,
                    color: region === r ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: 6, padding: "4px 9px", fontSize: 11,
                    cursor: "pointer", fontWeight: region === r ? 700 : 400,
                    whiteSpace: "nowrap", transition: "background-color 0.12s, border-color 0.12s, color 0.12s",
                  }}
                >{r}</button>
              ))}
              {profile && (
                <button
                  onClick={handleUnratedToggle}
                  style={{
                    backgroundColor: unrated ? "rgba(232,213,163,0.12)" : "transparent",
                    border: `1px solid ${unrated ? "rgba(232,213,163,0.45)" : "var(--border)"}`,
                    color: unrated ? "var(--accent)" : "var(--text-muted)",
                    borderRadius: 6, padding: "4px 9px", fontSize: 11,
                    cursor: "pointer", fontWeight: unrated ? 700 : 400,
                    whiteSpace: "nowrap", transition: "background-color 0.12s, border-color 0.12s, color 0.12s",
                  }}
                >미청음만</button>
              )}
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
      </div>

      {/* scoreUserId 일회용 필터 배지 (데스크탑 전용 — 모바일은 활성 칩으로 처리) */}
      {scoreUserId && myScore !== null && (() => {
        const scoreUser = getUserById(scoreUserId);
        return (
          <div className="hidden sm:flex" style={{ alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              backgroundColor: "rgba(var(--accent-rgb), 0.1)",
              border: "1px solid rgba(var(--accent-rgb), 0.35)",
              borderRadius: 20, padding: "4px 12px",
              fontSize: 12, color: "var(--accent)", fontWeight: 600,
            }}>
              {scoreUser?.display_name ?? scoreUserId}님의 {myScore}점 앨범
              <button
                onClick={() => {
                  setMyScore(null);
                  setScoreUserId(null);
                  handleFilter(search, genre, region, sort, unrated, null, null);
                  router.replace(pathname, { scroll: false });
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}
              >
                ✕
              </button>
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>— 일회용 필터</span>
          </div>
        );
      })()}

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
          <p style={{ fontSize: 28, marginBottom: 2 }}>♪</p>
          <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>
            {search ? `"${search}" 검색 결과가 없어요` : "아직 음반이 없어요"}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6, marginBottom: 4 }}>
            {search ? "다른 검색어로 찾거나 직접 추가해보세요" : "필터를 바꾸거나 음반을 추가해보세요"}
          </p>
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
              <AlbumCard album={album} onNavigate={() => {
                setNavigatingAlbumId(album.id);
                fetchControllerRef.current?.abort();
                if (debounceRef.current) clearTimeout(debounceRef.current);
                if (search) trackSearch(search, albums.length);
              }} />
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
      {loadMoreError && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 0" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>더 불러오지 못했어요</p>
          <button
            onClick={() => handleLoadMore()}
            style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit" }}
          >
            다시 시도
          </button>
        </div>
      )}
      {!hasMore && albums.length > 0 && !loading && !loadMoreError && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: "16px 0", opacity: 0.5 }}>
          전부 불러왔어요
        </p>
      )}

      <AlbumFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        genre={genre}
        region={region}
        sort={sort}
        unrated={unrated}
        myScore={myScore}
        genres={genres}
        hasProfile={!!profile}
        onGenreChange={handleGenreChange}
        onRegionChange={handleRegionChange}
        onSortChange={handleSortChange}
        onUnratedToggle={handleUnratedToggle}
        onScoreFilter={handleScoreFilter}
        onReset={handleReset}
      />

      {showAddModal && (
        <AlbumAddModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => handleFilter(search, genre, region, sort, unrated, myScore)}
          initialSearch={albums.length === 0 && search ? search : undefined}
        />
      )}

      {/* 앨범 클릭 즉시 노출되는 모달 로딩 스켈레톤 (loading.tsx와 동일, z-99로 실제 모달 뒤에 깔림) */}
      {navigatingAlbumId && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 99,
            backgroundColor: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              width: "100%", maxWidth: 520,
              overflow: "hidden", display: "flex", flexDirection: "column",
            }}
            className="rounded-t-2xl sm:rounded-2xl sm:mb-10 sm:max-h-[85dvh]"
          >
            <div className="sm:hidden" style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
            </div>
            <div className="skeleton-shimmer" style={{ width: "100%", aspectRatio: "16/7", flexShrink: 0 }} />
            <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton-shimmer" style={{ height: 22, width: "55%", borderRadius: 6 }} />
              <div className="skeleton-shimmer" style={{ height: 14, width: "38%", borderRadius: 6 }} />
              <div className="skeleton-shimmer" style={{ height: 14, width: "28%", borderRadius: 6, marginTop: 4 }} />
              <div className="skeleton-shimmer" style={{ height: 80, width: "100%", borderRadius: 8, marginTop: 8 }} />
            </div>
            <div style={{ height: 24 }} />
          </div>
        </div>
      )}
    </>
  );
}
