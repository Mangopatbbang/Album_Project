"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import type { WrappedData } from "@/app/api/profile/[userId]/wrapped/route";
import { scoreColor } from "@/lib/score";
import Spinner from "@/components/ui/Spinner";
import UserAvatar from "@/components/ui/UserAvatar";
import { useUserAvatars } from "@/context/UserAvatarsContext";

const SLIDES = ["intro", "total", "avg", "genres", "artists", "peak", "best", "review", "share"] as const;
type Slide = typeof SLIDES[number];

export default function WrappedClient({ userId, year }: { userId: string; year: number }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const avatarMap = useUserAvatars();
  const [data, setData] = useState<WrappedData | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [slide, setSlide] = useState<Slide>("intro");
  const [animating, setAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // admin 게이트
  useEffect(() => {
    if (!loading && (!profile || profile.role !== "admin")) {
      router.replace("/");
    }
  }, [profile, loading, router]);

  useEffect(() => {
    fetch(`/api/profile/${userId}/wrapped?year=${year}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setFetchError(true));
  }, [userId, year]);

  const goTo = (target: Slide) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setSlide(target);
      setAnimating(false);
    }, 180);
  };

  const nextSlide = () => {
    const idx = SLIDES.indexOf(slide);
    if (idx < SLIDES.length - 1) goTo(SLIDES[idx + 1]);
  };

  const prevSlide = () => {
    const idx = SLIDES.indexOf(slide);
    if (idx > 0) goTo(SLIDES[idx - 1]);
  };

  if (loading || (!profile && !loading)) return null;
  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg)" }}>
      <div style={{ width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (profile?.role !== "admin") return null;

  if (fetchError) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>불러오지 못했어요</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg)" }}>
        <Spinner />
      </div>
    );
  }

  const slideIdx = SLIDES.indexOf(slide);
  const avatarUrl = avatarMap[userId] ?? null;

  const slideContent: Record<Slide, React.ReactNode> = {
    intro: (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <UserAvatar avatarUrl={avatarUrl} size={64} />
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>{data.displayName}의</p>
        <p style={{ color: "var(--text)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1, fontFamily: "var(--font-playfair, serif)" }}>
          {year}년<br />청음 결산
        </p>
        {data.total === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 20 }}>아직 {year}년 청음 기록이 없어요</p>
        )}
      </div>
    ),

    total: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>{year}년에 들은 앨범</p>
        <p style={{ fontSize: 72, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "var(--font-playfair, serif)" }}>
          {data.total}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 18, marginTop: 8 }}>장</p>
        {data.firstAlbum && (
          <div style={{ marginTop: 24, padding: "12px 16px", backgroundColor: "var(--bg-elevated)", borderRadius: 10, display: "inline-block" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 4 }}>첫 청음</p>
            <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{data.firstAlbum.title}</p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{data.firstAlbum.date}</p>
          </div>
        )}
      </div>
    ),

    avg: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>평균 점수</p>
        {data.avgScore ? (
          <>
            <p style={{ fontSize: 72, fontWeight: 800, color: scoreColor(data.avgScore), letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "var(--font-playfair, serif)" }}>
              {data.avgScore}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 16, marginTop: 8 }}>/ 8점</p>
            {data.hofCount > 0 && (
              <p style={{ color: "rgba(232,213,163,0.9)", fontSize: 13, marginTop: 16 }}>
                명반전 {data.hofCount}장 보유
              </p>
            )}
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>데이터 없음</p>
        )}
      </div>
    ),

    genres: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>가장 많이 들은 장르</p>
        {data.topGenres.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>데이터 없음</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            {data.topGenres.map((g, i) => (
              <div key={g.genre} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 12, width: 16, textAlign: "right" }}>
                  {i + 1}
                </span>
                <span style={{
                  fontSize: i === 0 ? 22 : i === 1 ? 18 : 15,
                  fontWeight: 700,
                  color: i === 0 ? "var(--accent)" : "var(--text-sub)",
                  letterSpacing: "-0.02em",
                }}>
                  {g.genre}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{g.count}장</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    artists: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>가장 많이 들은 아티스트</p>
        {data.topArtists.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>데이터 없음</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            {data.topArtists.map((a, i) => (
              <div key={a.artist} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 12, width: 16, textAlign: "right" }}>
                  {i + 1}
                </span>
                <span style={{
                  fontSize: i === 0 ? 22 : i === 1 ? 18 : 15,
                  fontWeight: 700,
                  color: i === 0 ? "var(--accent)" : "var(--text-sub)",
                  letterSpacing: "-0.02em",
                  maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {a.artist}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{a.count}장</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    peak: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>가장 많이 들은 달</p>
        {data.peakMonth ? (
          <>
            <p style={{ fontSize: 56, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "var(--font-playfair, serif)" }}>
              {data.peakMonth.label}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 10 }}>
              {data.peakMonth.count}장 청음
            </p>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>데이터 없음</p>
        )}
      </div>
    ),

    best: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>{year}년 최고의 앨범</p>
        {data.bestAlbum ? (
          <>
            {data.bestAlbum.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.bestAlbum.cover_url}
                alt={data.bestAlbum.title}
                style={{
                  width: 120, height: 120, borderRadius: 10, objectFit: "cover",
                  margin: "0 auto 16px", display: "block",
                  boxShadow: `0 0 28px ${scoreColor(data.bestAlbum.score)}55`,
                }}
              />
            )}
            <p style={{ color: "var(--text)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {data.bestAlbum.title}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{data.bestAlbum.artist}</p>
            <p style={{ color: scoreColor(data.bestAlbum.score), fontSize: 24, fontWeight: 800, marginTop: 12 }}>
              {data.bestAlbum.score}점
            </p>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>데이터 없음</p>
        )}
      </div>
    ),

    review: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>소감을 남긴 앨범</p>
        <p style={{ fontSize: 64, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "var(--font-playfair, serif)" }}>
          {data.reviewCount}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 16, marginTop: 8 }}>장</p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16, opacity: 0.6 }}>
          전체 {data.total}장 중 {data.total > 0 ? Math.round((data.reviewCount / data.total) * 100) : 0}%
        </p>
      </div>
    ),

    share: (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, fontFamily: "var(--font-playfair, serif)" }}>
          {year}년 결산
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
          {data.total}장 · 평균 {data.avgScore ?? "–"}점
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 200, margin: "0 auto" }}>
          <a
            href={`/profile/${userId}`}
            style={{
              display: "block", padding: "10px 20px",
              backgroundColor: "var(--accent)", color: "var(--bg)",
              borderRadius: 8, fontSize: 13, fontWeight: 700,
              textDecoration: "none", textAlign: "center",
            }}
          >
            청음록으로 →
          </a>
        </div>
      </div>
    ),
  };

  return (
    <div style={{
      minHeight: "100dvh",
      backgroundColor: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 24px",
    }}>
      {/* 슬라이드 카드 */}
      <div
        ref={cardRef}
        style={{
          width: "100%", maxWidth: 360,
          minHeight: 320,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 32px",
          animation: animating ? "fadeOut 0.18s ease-out" : "fadeIn 0.18s ease-out",
        }}
      >
        {slideContent[slide]}
      </div>

      {/* 점 인디케이터 */}
      <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
        {SLIDES.map((s, i) => (
          <button
            key={s}
            onClick={() => goTo(s)}
            style={{
              width: s === slide ? 20 : 6, height: 6, borderRadius: 3,
              backgroundColor: s === slide ? "var(--accent)" : "var(--border-light)",
              border: "none", cursor: "pointer", padding: 0,
              transition: "width 0.2s ease, background-color 0.2s ease",
            }}
          />
        ))}
      </div>

      {/* 네비 버튼 */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={prevSlide}
          disabled={slideIdx === 0}
          style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 20px",
            color: "var(--text-muted)", fontSize: 13, cursor: slideIdx === 0 ? "default" : "pointer",
            opacity: slideIdx === 0 ? 0.3 : 1, transition: "opacity 0.15s",
          }}
        >
          ‹ 이전
        </button>
        <button
          onClick={nextSlide}
          disabled={slideIdx === SLIDES.length - 1}
          style={{
            background: "none", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 20px",
            color: "var(--text-muted)", fontSize: 13, cursor: slideIdx === SLIDES.length - 1 ? "default" : "pointer",
            opacity: slideIdx === SLIDES.length - 1 ? 0.3 : 1, transition: "opacity 0.15s",
          }}
        >
          다음 ›
        </button>
      </div>

      <style>{`
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
