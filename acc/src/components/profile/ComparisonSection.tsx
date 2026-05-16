"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@/types";
import UserAvatar from "@/components/ui/UserAvatar";
import { GENRE_COLOR } from "@/lib/bio";
import Spinner from "@/components/ui/Spinner";

type ComparisonItem = {
  user: User;
  commonCount: number;
  pearson: number | null;
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

export default function ComparisonSection({ userId, topGenreMap, avatarMap }: Props) {
  const [comparisons, setComparisons] = useState<ComparisonItem[] | null>(null);
  const [bestMatch, setBestMatch] = useState<ComparisonItem | null>(null);
  const loadedRef = useRef(false);
  const sectionRef = useRef<HTMLDivElement>(null);

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
            })
            .catch(() => {});
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [userId]);

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
  const isLoading = comparisons === null;

  return (
    <div ref={sectionRef}>
      {/* 로딩 중 */}
      {isLoading && (
        <div style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 80,
        }}>
          <Spinner />
        </div>
      )}

      {/* 취향 궁합 */}
      {!isLoading && bestMatch && (() => {
        const pct = Math.round(Math.max(0, bestMatch.pearson ?? 0) * 100);
        return (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px 28px",
              marginBottom: 16,
            }}
          >
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
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                공통 {bestMatch.commonCount}장
              </p>

              {/* 유사도 퍼센트 바 */}
              <div style={{ margin: "10px auto 0", maxWidth: 180 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>유사도</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{pct}% 일치</span>
                </div>
                <div style={{ height: 6, backgroundColor: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    backgroundColor: pct >= 80 ? "var(--accent)" : pct >= 60 ? "#a0c4ff" : "var(--text-muted)",
                    borderRadius: 4,
                    transition: "width 0.6s ease-out",
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

      {/* 멤버 비교 */}
      {!isLoading && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            멤버 비교
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {comparisons!.map(({ user: other, commonCount, pearson }) => {
              const pct = pearson !== null ? Math.round(Math.max(0, pearson) * 100) : null;
              return (
                <div
                  key={other.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                  className="hover:opacity-70 transition-opacity cursor-default"
                >
                  <Link
                    href={`/profile/${other.id}`}
                    style={{ color: "var(--text-sub)", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                    className="hover:text-[var(--accent)] transition-colors"
                  >
                    <UserAvatar avatarUrl={avatarMap?.[other.id]} size={18} />
                    {other.display_name}
                    {genreBadges(other.id)}
                  </Link>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>공통 {commonCount}장</p>
                    {pct !== null ? (
                      <p style={{
                        color: pct >= 80 ? "var(--accent)" : pct >= 60 ? "#a0c4ff" : "var(--text-muted)",
                        fontSize: 12, fontWeight: 600, marginTop: 2,
                      }}>
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
        </div>
      )}
    </div>
  );
}
