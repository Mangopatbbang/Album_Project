"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@/types";
import UserAvatar from "@/components/ui/UserAvatar";
import { GENRE_COLOR } from "@/lib/bio";
import Spinner from "@/components/ui/Spinner";
import { scoreColor } from "@/lib/score";

type ComparisonItem = {
  user: User;
  commonCount: number;
  pearson: number | null;
};

type CommonAlbum = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  myScore: number;
  theirScore: number;
  diff: number;
};

type CommonModal = {
  userId: string;
  displayName: string;
  commonCount: number;
  albums: CommonAlbum[] | null;
  loading: boolean;
};

type Props = {
  userId: string;
  topGenreMap?: Record<string, string[]>;
  avatarMap?: Record<string, string | null>;
};

function similarityLabel(pearson: number): string {
  const pct = Math.round(Math.max(0, pearson) * 100);
  if (pct >= 80) return "취향이 매우 비슷해요";
  if (pct >= 60) return "취향이 꽤 비슷해요";
  return "취향이 달라요";
}

const INITIAL_COMPARISON = 5;

export default function ComparisonSection({ userId, topGenreMap, avatarMap }: Props) {
  const [comparisons, setComparisons] = useState<ComparisonItem[] | null>(null);
  const [bestMatch, setBestMatch] = useState<ComparisonItem | null>(null);
  const [barWidths, setBarWidths] = useState<Record<string, number>>({});
  const [fetchError, setFetchError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [commonModal, setCommonModal] = useState<CommonModal | null>(null);
  const loadedRef = useRef(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    loadedRef.current = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadedRef.current) {
          loadedRef.current = true;
          fetch(`/api/profile/${userId}/comparison`)
            .then((r) => r.json())
            .then((data) => {
              if (data.comparisons) setComparisons(data.comparisons);
              if (data.bestMatch) setBestMatch(data.bestMatch);
              const allItems: ComparisonItem[] = [...(data.comparisons ?? []), ...(data.bestMatch ? [data.bestMatch] : [])];
              requestAnimationFrame(() => {
                const widths: Record<string, number> = {};
                allItems.forEach((item) => {
                  widths[item.user.id] = Math.round(Math.max(0, item.pearson ?? 0) * 100);
                });
                setBarWidths(widths);
              });
            })
            .catch(() => { setComparisons([]); setFetchError(true); });
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [userId]);

  // 공통 앨범 모달 열기
  const openCommon = async (other: User, commonCount: number) => {
    setCommonModal({ userId: other.id, displayName: other.display_name, commonCount, albums: null, loading: true });
    const res = await fetch(`/api/profile/${userId}/common?with=${other.id}`);
    if (res.ok) {
      const { albums } = await res.json();
      setCommonModal((prev) => prev ? { ...prev, albums, loading: false } : null);
    } else {
      setCommonModal((prev) => prev ? { ...prev, albums: [], loading: false } : null);
    }
  };

  const closeCommon = () => setCommonModal(null);

  const genreBadges = (id: string) => (topGenreMap?.[id] ?? []).map((g) => {
    const gColor = GENRE_COLOR[g] ?? "#94a3b8";
    return (
      <span key={g} style={{
        fontSize: 10, fontWeight: 600,
        backgroundColor: `${gColor}1a`, color: gColor,
        border: `1px solid ${gColor}40`,
        borderRadius: 4, padding: "1px 5px",
      }}>{g}</span>
    );
  });

  const retryFetch = () => {
    setFetchError(false);
    setComparisons(null);
    fetch(`/api/profile/${userId}/comparison`)
      .then((r) => r.json())
      .then((data) => {
        if (data.comparisons) setComparisons(data.comparisons);
        if (data.bestMatch) setBestMatch(data.bestMatch);
        const allItems: ComparisonItem[] = [...(data.comparisons ?? []), ...(data.bestMatch ? [data.bestMatch] : [])];
        requestAnimationFrame(() => {
          const widths: Record<string, number> = {};
          allItems.forEach((item) => { widths[item.user.id] = Math.round(Math.max(0, item.pearson ?? 0) * 100); });
          setBarWidths(widths);
        });
      })
      .catch(() => { setComparisons([]); setFetchError(true); });
  };

  const isLoading = comparisons === null && !fetchError;

  return (
    <div ref={sectionRef}>
      {/* 공통 앨범 모달 */}
      {commonModal && (
        <div
          ref={backdropRef}
          onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
          onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current) closeCommon(); mouseDownOnBackdrop.current = false; }}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 14, width: "min(520px, 100%)", maxHeight: "80vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", margin: "0 0 2px 0" }}>
                  공통 청음
                </p>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                  {commonModal.displayName}
                  <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                    {commonModal.loading ? "…" : `${commonModal.albums?.length ?? 0}장`}
                  </span>
                </h2>
              </div>
              <button
                onClick={closeCommon}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, padding: 10, margin: -6, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* 열 헤더 */}
            {!commonModal.loading && (commonModal.albums?.length ?? 0) > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 20px", borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}>
                <span style={{ width: 36, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em" }}>앨범</span>
                <span style={{ width: 28, textAlign: "center", fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>나</span>
                <span style={{ width: 28, textAlign: "center", fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>상대</span>
              </div>
            )}

            {/* 본문 */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {commonModal.loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                  <Spinner size={20} />
                </div>
              ) : !commonModal.albums || commonModal.albums.length === 0 ? (
                <p style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13 }}>
                  공통으로 청음한 앨범이 없어요
                </p>
              ) : (
                commonModal.albums.map((album) => (
                  <div
                    key={album.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 20px", borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {album.coverUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img loading="lazy" src={album.coverUrl} alt={album.title}
                          style={{ width: 36, height: 36, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 36, borderRadius: 5, flexShrink: 0, backgroundColor: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)" }}>♪</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {album.title}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {album.artist}
                      </p>
                    </div>
                    <span style={{ width: 28, textAlign: "center", fontWeight: 700, fontSize: 14, color: scoreColor(album.myScore), flexShrink: 0 }}>
                      {album.myScore}
                    </span>
                    <span style={{ width: 28, textAlign: "center", fontWeight: 700, fontSize: 14, color: scoreColor(album.theirScore), flexShrink: 0 }}>
                      {album.theirScore}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 푸터: 이견 요약 */}
            {!commonModal.loading && (commonModal.albums?.length ?? 0) > 1 && (() => {
              const albums = commonModal.albums!;
              const avgDiff = albums.reduce((s, a) => s + a.diff, 0) / albums.length;
              const sameCount = albums.filter(a => a.diff === 0).length;
              return (
                <div style={{
                  padding: "10px 20px", borderTop: "1px solid var(--border)",
                  fontSize: 11, color: "var(--text-muted)", flexShrink: 0,
                  display: "flex", gap: 12,
                }}>
                  <span>완전 일치 <strong style={{ color: "var(--text-sub)" }}>{sameCount}장</strong></span>
                  <span>평균 점수 차 <strong style={{ color: "var(--text-sub)" }}>{avgDiff.toFixed(1)}점</strong></span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
          <Spinner />
        </div>
      )}

      {/* 오류 */}
      {fetchError && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오지 못했어요</p>
          <button onClick={retryFetch} style={{ padding: "6px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-sub)", fontSize: 12, cursor: "pointer" }}>
            다시 시도
          </button>
        </div>
      )}

      {/* 취향 궁합 */}
      {!isLoading && !fetchError && bestMatch && (() => {
        const pct = Math.round(Math.max(0, bestMatch.pearson ?? 0) * 100);
        return (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
              취향 궁합
            </p>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <UserAvatar avatarUrl={avatarMap?.[bestMatch.user.id]} size={40} />
              </div>
              <Link
                href={`/profile/${bestMatch.user.id}`}
                style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
                className="hover:text-[var(--accent)] transition-colors"
              >
                {bestMatch.user.display_name}
              </Link>
              {(topGenreMap?.[bestMatch.user.id]?.length ?? 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
                  {genreBadges(bestMatch.user.id)}
                </div>
              )}
              <button
                onClick={() => openCommon(bestMatch.user, bestMatch.commonCount)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}
                  className="hover:text-[var(--accent)] transition-colors underline underline-offset-2">
                  공통 {bestMatch.commonCount}장 보기
                </p>
              </button>

              <div style={{ margin: "10px auto 0", maxWidth: 180 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>유사도</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{pct}% 일치</span>
                </div>
                <div style={{ height: 6, backgroundColor: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${barWidths[bestMatch.user.id] ?? 0}%`,
                    backgroundColor: pct >= 80 ? "var(--accent)" : pct >= 60 ? "#a0c4ff" : "var(--text-muted)",
                    borderRadius: 4,
                    transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                  }} />
                </div>
              </div>

              <p style={{ color: "var(--accent)", fontSize: 12, marginTop: 10, fontWeight: 500 }}>
                {similarityLabel(bestMatch.pearson ?? 0)}
              </p>
            </div>
          </div>
        );
      })()}

      {/* 취향 데이터 부족 */}
      {!isLoading && !fetchError && comparisons !== null && comparisons.length === 0 && !bestMatch && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>취향 궁합</p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.7 }}>
            평가가 쌓이면 나와 취향이<br />비슷한 멤버를 찾아드려요
          </p>
        </div>
      )}

      {/* 멤버 비교 */}
      {!isLoading && !fetchError && comparisons !== null && comparisons.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            멤버 비교
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(showAll ? comparisons! : comparisons!.slice(0, INITIAL_COMPARISON)).map(({ user: other, commonCount, pearson }) => {
              const pct = pearson !== null ? Math.round(Math.max(0, pearson) * 100) : null;
              return (
                <div
                  key={other.id}
                  onClick={() => { if (commonCount > 0) openCommon(other, commonCount); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8, padding: "10px 0", borderBottom: "1px solid var(--border)",
                    cursor: commonCount > 0 ? "pointer" : "default",
                  }}
                  className={commonCount > 0 ? "hover:opacity-70 transition-opacity" : ""}
                >
                  <Link
                    href={`/profile/${other.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: "var(--text-sub)", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}
                    className="hover:text-[var(--accent)] transition-colors"
                  >
                    <UserAvatar avatarUrl={avatarMap?.[other.id]} size={18} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {other.display_name}
                    </span>
                    <span style={{ display: "inline-flex", gap: 4, flexShrink: 0 }}>
                      {genreBadges(other.id)}
                    </span>
                  </Link>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ color: commonCount > 0 ? "var(--text-sub)" : "var(--text-muted)", fontSize: 11 }}>
                      공통 {commonCount}장 {commonCount > 0 && <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>}
                    </p>
                    {pct !== null ? (
                      <p style={{ color: pct >= 80 ? "var(--accent)" : pct >= 60 ? "#a0c4ff" : "var(--text-muted)", fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                        {pct}% 일치
                      </p>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>공통 3장 이상 필요</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {comparisons!.length > INITIAL_COMPARISON && (
            <button
              onClick={() => setShowAll((v) => !v)}
              style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 12, textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}
            >
              {showAll ? "접기" : `+${comparisons!.length - INITIAL_COMPARISON}명 더보기`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
