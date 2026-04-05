"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AlbumCard from "./AlbumCard";
import AlbumModal from "./AlbumModal";
import AlbumAddModal from "./AlbumAddModal";
import { AlbumWithRatings } from "@/types";
import { useAuth } from "@/context/AuthContext";

type Props = {
  initialAlbums: AlbumWithRatings[];
  initialHasMore: boolean;
  initialNextOffset: number | null;
  genres: string[];
};

const BASE_SORT_OPTIONS = [
  { value: "newest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
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
  const [albums, setAlbums] = useState<AlbumWithRatings[]>(initialAlbums);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("newest");
  const [unrated, setUnrated] = useState(false);
  const [myScore, setMyScore] = useState<number | null>(null);
const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortOptions = profile
    ? [...BASE_SORT_OPTIONS, ...MY_SORT_OPTIONS]
    : BASE_SORT_OPTIONS;

  const fetchAlbums = useCallback(
    async (params: { search: string; genre: string; sort: string; unrated: boolean; myScore: number | null; offset?: number }) => {
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      if (params.genre) q.set("genre", params.genre);
      q.set("sort", params.sort);
      if (params.unrated && profile) {
        q.set("unrated", "true");
        q.set("userId", profile.id);
      }
      if (params.myScore && profile) {
        q.set("myScore", String(params.myScore));
        q.set("userId", profile.id);
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
    async (newSearch: string, newGenre: string, newSort: string, newUnrated: boolean, newMyScore: number | null) => {
      setLoading(true);
      try {
        const data = await fetchAlbums({ search: newSearch, genre: newGenre, sort: newSort, unrated: newUnrated, myScore: newMyScore });
        setAlbums(data.items ?? []);
        setHasMore(data.hasMore ?? false);
        setNextOffset(data.nextOffset ?? null);
      } catch {
        // 네트워크 오류 시 기존 목록 유지
      } finally {
        setLoading(false);
      }
    },
    [fetchAlbums]
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const data = await fetchAlbums({ search, genre, sort, unrated, myScore, offset: nextOffset ?? 0 });
      if (!data.items) return;
      setAlbums((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      // 네트워크 오류 시 현재 목록 유지
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, fetchAlbums, search, genre, sort, unrated, myScore, nextOffset]);

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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleFilter(val, genre, sort, unrated, myScore), 300);
  };

  const handleGenreChange = (val: string) => {
    setGenre(val);
    handleFilter(search, val, sort, unrated, myScore);
  };

  const handleSortChange = (val: string) => {
    setSort(val);
    handleFilter(search, genre, val, unrated, myScore);
  };

  const handleUnratedToggle = () => {
    const next = !unrated;
    const nextSort = next && (sort === "my_desc" || sort === "my_asc") ? "newest" : sort;
    setUnrated(next);
    if (next) setMyScore(null); // 미평가 켜면 점수필터 해제
    if (nextSort !== sort) setSort(nextSort);
    handleFilter(search, genre, nextSort, next, null);
  };

  const handleScoreFilter = (score: number) => {
    const next = myScore === score ? null : score;
    setMyScore(next);
    setUnrated(false); // 점수필터 켜면 미평가 해제
    handleFilter(search, genre, sort, false, next);
  };

return (
    <>
      {/* 필터 바 */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 32 }} className="py-4 flex flex-col gap-3">

      {/* Row 1: 검색 + 입고 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="제목 / 아티스트 검색"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 6,
            padding: "7px 12px",
            fontSize: 13,
            outline: "none",
            flex: 1,
            minWidth: 0,
          }}
        />
        {profile && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: "var(--accent)",
              border: "none",
              color: "var(--bg)",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            입고
          </button>
        )}
      </div>

      {/* Row 2: 장르, 정렬, 미청음만, 개수 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 장르 */}
        <select
          value={genre}
          onChange={(e) => handleGenreChange(e.target.value)}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: genre ? "var(--text)" : "var(--text-muted)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
            cursor: "pointer",
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          <option value="">전체 장르</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        {/* 정렬 */}
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
            cursor: "pointer",
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* 미평가 토글 (로그인 시에만) */}
        {profile && (
          <button
            onClick={handleUnratedToggle}
            style={{
              backgroundColor: unrated ? "var(--accent)" : "var(--bg-card)",
              border: `1px solid ${unrated ? "var(--accent)" : "var(--border)"}`,
              color: unrated ? "var(--bg)" : "var(--text-muted)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: unrated ? 600 : 400,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            미청음만
          </button>
        )}

        <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: "auto", flexShrink: 0 }}>
          {albums.length}장{hasMore ? "+" : ""}
        </span>
      </div>

      {/* 내 점수 필터 (로그인 시) */}
      {profile && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>내 평점</span>
          {[1,2,3,4,5,6,7,8].map((s) => (
            <button
              key={s}
              onClick={() => handleScoreFilter(s)}
              style={{
                width: 36, height: 36,
                borderRadius: 6,
                border: `1px solid ${myScore === s ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: myScore === s ? "var(--accent)" : "var(--bg-card)",
                color: myScore === s ? "var(--bg)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: myScore === s ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
          {myScore && (
            <button
              onClick={() => handleScoreFilter(myScore)}
              style={{ color: "var(--text-muted)", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}
            >
              ✕ 초기화
            </button>
          )}
        </div>
      )}
      </div>

      {/* 앨범 그리드 */}
      {loading && albums.length === 0 ? (
        <div style={{ color: "var(--text-muted)" }} className="text-center py-20 text-sm">
          불러오는 중...
        </div>
      ) : albums.length === 0 ? (
        <div style={{ color: "var(--text-muted)" }} className="text-center py-20 text-sm">
          인연 닿는 음반이 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} onClick={setSelectedAlbum} />
          ))}
        </div>
      )}

      {/* 무한 스크롤 sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && albums.length > 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
          불러오는 중...
        </div>
      )}

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          onSaved={async (albumId) => {
            const res = await fetch(`/api/albums/${albumId}`);
            if (!res.ok) return;
            const updated = await res.json();
            setAlbums((prev) => prev.map((a) => a.id === albumId ? { ...updated } : a));
            setSelectedAlbum((prev) => prev?.id === albumId ? { ...updated } : prev);
          }}
        />
      )}

      {showAddModal && (
        <AlbumAddModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => handleFilter(search, genre, sort, unrated, myScore)}
        />
      )}
    </>
  );
}
