"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { USERS } from "@/types";

type ComparisonItem = {
  user: (typeof USERS)[number];
  commonCount: number;
  diff: number | null;
};

type Props = {
  userId: string;
};

export default function ComparisonSection({ userId }: Props) {
  const [comparisons, setComparisons] = useState<ComparisonItem[] | null>(null);
  const [bestMatch, setBestMatch] = useState<ComparisonItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loaded) {
          setLoaded(true);
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
  }, [userId, loaded]);

  return (
    <div ref={sectionRef}>
      {/* 취향 궁합 */}
      {bestMatch && (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 28px",
            marginBottom: 16,
          }}
        >
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              marginBottom: 16,
            }}
          >
            취향 궁합
          </p>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>{bestMatch.user.emoji}</p>
            <Link
              href={`/profile/${bestMatch.user.id}`}
              style={{
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
              className="hover:text-[var(--accent)] transition-colors"
            >
              {bestMatch.user.display_name}
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
              공통 {bestMatch.commonCount}장 · 앨범당 평균{" "}
              <span
                style={{
                  color:
                    bestMatch.diff! < 0.8 ? "var(--accent)" : "var(--text-sub)",
                  fontWeight: 600,
                }}
              >
                {bestMatch.diff!.toFixed(2)}점 차이
              </span>
            </p>
            <p
              style={{
                color: "var(--accent)",
                fontSize: 12,
                marginTop: 8,
                fontWeight: 500,
              }}
            >
              {bestMatch.diff! < 0.8
                ? "취향이 가장 비슷한 청음인"
                : "그나마 가장 비슷한 청음인"}
            </p>
          </div>
        </div>
      )}

      {/* 멤버 비교 */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "24px 28px",
        }}
      >
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          멤버 비교
        </p>
        {comparisons === null ? (
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>불러오는 중…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {comparisons.map(({ user: other, commonCount, diff }) => (
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
                  style={{
                    color: "var(--text-sub)",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  {other.emoji} {other.display_name}
                </Link>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
                    공통 {commonCount}장
                  </p>
                  {diff !== null && (
                    <p
                      style={{
                        color:
                          diff < 0.8
                            ? "var(--accent)"
                            : diff > 1.5
                            ? "var(--text-muted)"
                            : "var(--text-sub)",
                        fontSize: 12,
                        fontWeight: 600,
                        marginTop: 2,
                      }}
                    >
                      {diff < 0.8 ? "취향 비슷" : `앨범당 ${diff}점 차이`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
