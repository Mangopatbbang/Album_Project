"use client";

import { scoreColor } from "@/lib/score";

type Props = {
  title: string;
  artist: string;
  coverUrl: string | null | undefined;
  score: number;
  review: string | null | undefined;
  genre?: string | null;
  userName?: string;
  spotifyId?: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export default function StoryCard({
  title,
  artist,
  coverUrl,
  score,
  review,
  genre,
  userName,
  spotifyId,
  containerRef,
}: Props) {
  const proxiedUrl = coverUrl
    ? `/api/image-proxy?url=${encodeURIComponent(coverUrl)}`
    : null;

  const color = scoreColor(score);

  return (
    <div
      ref={containerRef}
      style={{
        width: 360,
        height: 640,
        position: "relative",
        overflow: "hidden",
        borderRadius: 0,
        backgroundColor: "#1a1817",
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* 블러 배경 */}
      {proxiedUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${proxiedUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(32px) saturate(1.6) brightness(0.55)",
            transform: "scale(1.12)",
          }}
        />
      )}

      {/* 다크 그래디언트 오버레이 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(165deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.82) 100%)",
        }}
      />

      {/* 콘텐츠 레이어 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          padding: "64px 32px 76px",
        }}
      >
        {/* 상단: 점수(좌) + 커버(우) */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* 점수 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, lineHeight: 1 }}>
              <span
                style={{
                  fontSize: 76,
                  fontWeight: 900,
                  lineHeight: 1,
                  color,
                  letterSpacing: "-0.05em",
                  textShadow:
                    score >= 7 ? `0 0 24px ${color}88, 0 0 8px ${color}55` : "none",
                }}
              >
                {score}
              </span>
              <span style={{ fontSize: 20, color: "rgba(255,255,255,0.38)", fontWeight: 400 }}>
                /8
              </span>
            </div>

            {/* 제목 */}
            <p
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.25,
                letterSpacing: "-0.025em",
                marginTop: 14,
                wordBreak: "break-word",
              }}
            >
              {title}
            </p>

            {/* 아티스트 · 장르 */}
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.58)",
                marginTop: 5,
                letterSpacing: "-0.01em",
              }}
            >
              {artist}
              {genre && (
                <span style={{ color: "rgba(255,255,255,0.35)" }}> · {genre}</span>
              )}
            </p>
          </div>

          {/* 커버 이미지 */}
          {proxiedUrl ? (
            <div
              style={{
                width: 88,
                height: 88,
                flexShrink: 0,
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                marginTop: 6,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxiedUrl}
                alt={title}
                crossOrigin="anonymous"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                flexShrink: 0,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 28, color: "rgba(255,255,255,0.3)" }}>♪</span>
            </div>
          )}
        </div>

        {/* 여백 */}
        <div style={{ flex: 1 }} />

        {/* 리뷰 */}
        {review && (
          <p
            style={{
              fontSize: 13.5,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.80)",
              lineHeight: 1.65,
              letterSpacing: "-0.01em",
              marginBottom: 18,
              wordBreak: "break-word",
            }}
          >
            &ldquo;{review}&rdquo;
          </p>
        )}

        {/* 하단 워터마크 행 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* 좌: 아차청음사 + Spotify */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.32)",
                letterSpacing: "0.07em",
              }}
            >
              아차청음사
            </span>
            {spotifyId && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,0.25)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <span style={{ fontSize: 10 }}>Spotify</span>
              </div>
            )}
          </div>

          {/* 우: 유저명 */}
          {userName && (
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.02em",
                fontWeight: 500,
              }}
            >
              {userName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
