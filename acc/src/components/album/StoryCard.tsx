"use client";

import { useState, useEffect } from "react";
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

// 앨범 커버에서 채도 높은 픽셀들의 지배적인 Hue 추출
function extractDominantHue(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 80;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(215); return; }
      ctx.drawImage(img, 0, 0, size, size);
      try {
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Array(36).fill(0);
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const chroma = max - min;
          const l = (max + min) / 2;
          if (chroma < 0.12 || l < 0.12 || l > 0.88) continue;
          let hue: number;
          if (max === r) hue = ((g - b) / chroma + (g < b ? 6 : 0)) * 60;
          else if (max === g) hue = ((b - r) / chroma + 2) * 60;
          else hue = ((r - g) / chroma + 4) * 60;
          buckets[Math.floor(hue / 10)] += chroma;
        }
        const best = buckets.indexOf(Math.max(...buckets));
        resolve(best * 10 + 5);
      } catch {
        resolve(215);
      }
    };
    img.onerror = () => resolve(215);
    img.src = url;
  });
}

// 캔버스로 그레인 노이즈 텍스처 data URI 생성
function generateNoiseBg(): string {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const imgData = ctx.createImageData(size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}

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
  const scoreFontSize = isDecimal ? 52 : 64;

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
          height: 432,
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
            opacity: 0.038,
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
        {/* 커버 히어로 — 상단 전체 너비 */}
        <div
          style={{
            height: 208,
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
                objectFit: "cover",
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
              <span style={{ fontSize: 52, color: "rgba(255,255,255,0.12)" }}>
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
              height: 96,
              background: `linear-gradient(to bottom, transparent 0%, ${panelBg} 100%)`,
            }}
          />
        </div>

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
              fontSize: 11,
              color: "rgba(255,255,255,0.40)",
              letterSpacing: "0.04em",
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
                    fontSize: 24,
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
                    fontSize: 14,
                    color: "rgba(255,255,255,0.22)",
                    fontWeight: 300,
                    lineHeight: 1,
                  }}
                >
                  /7
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
                  WebkitLineClamp: 4,
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
                    marginBottom: 5,
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  color: "rgba(255,255,255,0.18)",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <span style={{ fontSize: 9 }}>Spotify</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
