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
  likedTracks?: { index: number; name: string }[];
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
  likedTracks,
  containerRef,
}: Props) {
  const proxiedCover = coverUrl
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
        borderRadius: 12,
        backgroundColor: "#1a1817",
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* 블러 배경 */}
      {proxiedCover && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${proxiedCover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(40px) saturate(1.8) brightness(0.45)",
            transform: "scale(1.15)",
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
            "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.78) 100%)",
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
          alignItems: "center",
          padding: "48px 28px 56px",
        }}
      >
        {/* 상단: ACHA (좌) / 닉네임 (우) */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "0.18em", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            ACHA
          </span>
          {userName && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", letterSpacing: "0.02em" }}>
              {userName}
            </span>
          )}
        </div>

        {/* 점수 + 한줄평 */}
        <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1,
                color,
                letterSpacing: "-0.05em",
                textShadow:
                  score >= 7 ? `0 0 28px ${color}99, 0 0 10px ${color}55` : "none",
              }}
            >
              {score}
            </span>
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.38)", fontWeight: 400 }}>
              /8
            </span>
          </div>
          {review && (
            <p
              style={{
                flex: 1,
                margin: "44px 0 0",
                fontSize: 12,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.6,
                letterSpacing: "-0.01em",
                wordBreak: "break-word",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              &ldquo;{review}&rdquo;
            </p>
          )}
        </div>

        {/* 앨범 커버 — 중앙, 크게 */}
        <div
          style={{
            marginTop: 16,
            width: 172,
            height: 172,
            flexShrink: 0,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {proxiedCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxiedCover}
              alt={title}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 40, color: "rgba(255,255,255,0.3)" }}>♪</span>
            </div>
          )}
        </div>

        {/* 제목 + 아티스트 · 장르 */}
        <div style={{ marginTop: 14, textAlign: "center", width: "100%" }}>
          <p
            style={{
              fontSize: 19,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.25,
              letterSpacing: "-0.025em",
              wordBreak: "break-word",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.55)",
              marginTop: 4,
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {artist}
            {genre && <span style={{ color: "rgba(255,255,255,0.32)" }}> · {genre}</span>}
          </p>
        </div>

        {/* Best Tracks */}
        {likedTracks && likedTracks.length > 0 && (
          <div style={{ marginTop: 10, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.08em" }}>BEST TRACKS</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
            </div>
            {likedTracks.slice(0, 4).map((t) => (
              <div key={t.index} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", width: 18, textAlign: "right", flexShrink: 0 }}>
                  {t.index}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 여백 */}
        <div style={{ flex: 1 }} />

        {/* 하단 워터마크 */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.07em",
            }}
          >
            아차청음사
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {spotifyId && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,0.22)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <span style={{ fontSize: 10 }}>Spotify</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
