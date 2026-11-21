"use client";

import { useState, useEffect } from "react";
import { scoreColor } from "@/lib/score";
import { extractDominantHue, generateNoiseBg } from "@/lib/canvasUtils";
import { SpotifyIcon } from "@/components/ui/StreamingIcons";

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

  const [panelHue, setPanelHue] = useState(215);
  const [noiseBg, setNoiseBg] = useState("");

  useEffect(() => {
    if (!proxiedCover) return;
    extractDominantHue(proxiedCover).then(setPanelHue);
  }, [proxiedCover]);

  useEffect(() => {
    setNoiseBg(generateNoiseBg());
  }, []);

  const color = scoreColor(score);
  const isSpecial = score >= 8;
  const isDecimal = !Number.isInteger(score);
  const scoreLabel = isDecimal ? score.toFixed(1) : String(score);
  const hasReview = !!review;
  const scoreFontSize = hasReview
    ? (isDecimal ? 48 : 60)
    : (isDecimal ? 64 : 80);
  const starSize = hasReview ? 24 : 34;
  const slashSize = hasReview ? 14 : 19;

  const panelBg = `hsl(${panelHue}, 30%, 6%)`;
  const separatorColor = `hsla(${panelHue}, 50%, 60%, 0.18)`;
  const trackNumColor = `hsla(${panelHue}, 55%, 62%, 0.7)`;

  return (
    <div
      ref={containerRef}
      style={{
        width: 360,
        height: 640,
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        backgroundColor: panelBg,
        fontFamily:
          "var(--font-pretendard), 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* L0: 블러 배경 — 앨범 컬러가 패널 위 영역에 은은하게 배어나옴 */}
      {proxiedCover && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${proxiedCover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(28px) saturate(1.9) brightness(0.42)",
            transform: "scale(1.14)",
          }}
        />
      )}

      {/* L1: 하단 패널 — 앨범 Hue 기반 극도로 어두운 단색 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 350,
          backgroundColor: panelBg,
          zIndex: 1,
        }}
      />

      {/* L2: 그레인 노이즈 텍스처 — html-to-image 호환 data URI 방식 */}
      {noiseBg && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            backgroundImage: `url(${noiseBg})`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
            opacity: 0.07,
          }}
        />
      )}

      {/* L3: 콘텐츠 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 커버 히어로 — contain으로 잘림 없이, 옆 여백은 블러 배경이 채움 */}
        <div
          style={{
            height: 290,
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {proxiedCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxiedCover}
              alt={title}
              crossOrigin="anonymous"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 58, color: "rgba(255,255,255,0.18)" }}>
                ♪
              </span>
            </div>
          )}
          {/* 커버 하단 → 패널 그라디언트 페이드 */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 90,
              background: `linear-gradient(to bottom, transparent 0%, ${panelBg} 100%)`,
            }}
          />
        </div>

        {/* 고스트 배경 점수 — 패널 배경에 희미하게 깔리는 워터마크 */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -6,
            bottom: 20,
            fontSize: 192,
            fontFamily:
              "var(--font-barlow-condensed), 'Barlow Condensed', Impact, 'Arial Narrow', sans-serif",
            fontWeight: 900,
            fontStyle: "italic",
            letterSpacing: "-0.05em",
            lineHeight: 1,
            color,
            opacity: 0.07,
            userSelect: "none",
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          {scoreLabel}
        </span>

        {/* 패널 콘텐츠 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "14px 22px 20px",
          }}
        >
          {/* 유저네임 */}
          {userName && (
            <p
              style={{
                fontSize: 9.5,
                color: "rgba(255,255,255,0.28)",
                textAlign: "right",
                letterSpacing: "0.04em",
                marginBottom: 7,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName}
            </p>
          )}

          {/* 아티스트 · 장르 */}
          <p
            style={{
              fontSize: 10.5,
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {artist}
            {genre && (
              <span style={{ color: "rgba(255,255,255,0.20)" }}>
                {" "}· {genre}
              </span>
            )}
          </p>

          {/* 앨범 제목 */}
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.25,
              letterSpacing: "-0.025em",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxHeight: "48px",
            }}
          >
            {title}
          </p>

          {/* 구분선 */}
          <div
            style={{
              height: 1,
              backgroundColor: separatorColor,
              margin: "12px 0",
            }}
          />

          {/* 점수 + 한줄평 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: scoreFontSize,
                  fontWeight: 900,
                  fontStyle: "italic",
                  fontFamily:
                    "var(--font-barlow-condensed), 'Barlow Condensed', Impact, 'Arial Narrow', sans-serif",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color,
                  textShadow: isSpecial
                    ? `0 0 40px ${color}cc, 0 0 18px ${color}99`
                    : score >= 7
                    ? `0 0 22px ${color}77`
                    : "none",
                }}
              >
                {scoreLabel}
              </span>
              {isSpecial ? (
                <span
                  style={{
                    fontSize: starSize,
                    color,
                    fontWeight: 700,
                    textShadow: `0 0 16px ${color}aa`,
                    lineHeight: 1,
                  }}
                >
                  ★
                </span>
              ) : (
                <span
                  style={{
                    fontSize: slashSize,
                    color: "rgba(255,255,255,0.22)",
                    fontWeight: 300,
                    lineHeight: 1,
                  }}
                >
                  /8
                </span>
              )}
            </div>

            {review && (
              <p
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.52)",
                  lineHeight: 1.68,
                  letterSpacing: "-0.01em",
                  wordBreak: "break-word",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                &ldquo;{review}&rdquo;
              </p>
            )}
          </div>

          {/* Best Tracks */}
          {likedTracks && likedTracks.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ flex: 1, height: 1, backgroundColor: separatorColor }}
                />
                <span
                  style={{
                    fontSize: 8.5,
                    color: "rgba(255,255,255,0.20)",
                    letterSpacing: "0.15em",
                    fontWeight: 600,
                  }}
                >
                  BEST TRACKS
                </span>
                <div
                  style={{ flex: 1, height: 1, backgroundColor: separatorColor }}
                />
              </div>
              {likedTracks.slice(0, 3).map((t, i) => (
                <div
                  key={t.index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      width: 16,
                      textAlign: "right",
                      flexShrink: 0,
                      fontWeight: 700,
                      color: trackNumColor,
                      fontFamily: "monospace",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.68)",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 여백 */}
          <div style={{ flex: 1 }} />

          {/* 워터마크 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(255,255,255,0.20)",
                letterSpacing: "0.10em",
              }}
            >
              아차청음사
            </span>
            {spotifyId && (
              // Spotify 브랜드 가이드라인: 아이콘 단독 최소 21px
              // https://developer.spotify.com/documentation/design
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "rgba(255,255,255,0.28)",
                }}
              >
                <SpotifyIcon size={21} />
                <span style={{ fontSize: 11 }}>Spotify</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
