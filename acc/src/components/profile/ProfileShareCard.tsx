"use client";

import { useState, useEffect } from "react";
import { scoreColor } from "@/lib/score";
import { GENRE_COLOR } from "@/lib/bio";

function extractDominantHue(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 80;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
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
        const maxVal = Math.max(...buckets);
        if (maxVal === 0) { resolve(215); return; }
        resolve(buckets.indexOf(maxVal) * 10 + 5);
      } catch { resolve(215); }
    };
    img.onerror = () => resolve(215);
    img.src = url;
  });
}

function generateNoiseBg(): string {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
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

type Props = {
  displayName: string;
  displayEmoji: string;
  avatarUrl: string | null;
  bio: string | null;
  total: number;
  avg: string | null;
  topGenres: string[];
  topReview: { text: string; albumTitle: string; coverUrl: string | null; score: number } | null;
  coverUrls: (string | null)[];
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const BARLOW = "var(--font-barlow-condensed), 'Barlow Condensed', Impact, 'Arial Narrow', sans-serif";
const PRETENDARD = "var(--font-pretendard), 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

export default function ProfileShareCard({
  displayName, displayEmoji, avatarUrl, bio, total, avg,
  topGenres, topReview, coverUrls, containerRef,
}: Props) {
  const proxiedCovers = coverUrls.map(url =>
    url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : null
  );
  const proxiedAvatar = avatarUrl
    ? `/api/image-proxy?url=${encodeURIComponent(avatarUrl)}`
    : null;
  const proxiedQuoteCover = topReview?.coverUrl
    ? `/api/image-proxy?url=${encodeURIComponent(topReview.coverUrl)}`
    : null;
  const firstCover = proxiedCovers.find(c => c !== null) ?? proxiedQuoteCover;

  const [panelHue, setPanelHue] = useState(215);
  const [noiseBg, setNoiseBg] = useState("");

  useEffect(() => {
    if (!firstCover) return;
    extractDominantHue(firstCover).then(setPanelHue);
  }, [firstCover]);

  useEffect(() => { setNoiseBg(generateNoiseBg()); }, []);

  const panelBg = `hsl(${panelHue}, 28%, 6%)`;
  const separatorColor = `hsla(${panelHue}, 50%, 60%, 0.15)`;
  const accentColor = `hsl(${panelHue}, 68%, 62%)`;

  const avgNum = avg ? parseFloat(avg) : null;
  const avgDisplay = avgNum !== null
    ? (Number.isInteger(avgNum) ? String(avgNum) : avgNum.toFixed(1))
    : null;
  const avgColor = avgNum !== null ? scoreColor(avgNum) : "rgba(255,255,255,0.55)";

  // 커버 strip: 최대 3장 (정사각형 컨테이너, 잘림 없음)
  const stripCovers = proxiedCovers.slice(0, 3);
  const coverSize = Math.floor((360 - (stripCovers.length - 1) * 3) / Math.max(stripCovers.length, 1));

  return (
    <div
      ref={containerRef}
      style={{
        width: 360, height: 640,
        position: "relative", overflow: "hidden", borderRadius: 12,
        backgroundColor: panelBg,
        fontFamily: PRETENDARD,
        flexShrink: 0,
      }}
    >
      {/* L0: 블러 배경 (색감 출처) */}
      {firstCover && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${firstCover})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(32px) saturate(1.6) brightness(0.35)",
          transform: "scale(1.14)",
        }} />
      )}

      {/* L1: 전체 다크 패널 */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, backgroundColor: panelBg, opacity: 0.88 }} />

      {/* L2: 그레인 노이즈 */}
      {noiseBg && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          pointerEvents: "none",
          backgroundImage: `url(${noiseBg})`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.07,
        }} />
      )}

      {/* L3: 콘텐츠 */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        display: "flex", flexDirection: "column",
      }}>
        {/* Ghost watermark */}
        {total > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -10, bottom: 120,
              fontSize: 200,
              fontFamily: BARLOW,
              fontWeight: 900, fontStyle: "italic",
              letterSpacing: "-0.05em", lineHeight: 1,
              color: accentColor,
              opacity: 0.06,
              userSelect: "none", pointerEvents: "none",
              zIndex: -1,
            }}
          >
            {total}
          </span>
        )}

        {/* ── 메인 콘텐츠 (side padding) ── */}
        <div style={{ padding: "26px 22px 0", display: "flex", flexDirection: "column" }}>

          {/* 아바타 + 이름 + 소개글 */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              overflow: "hidden", flexShrink: 0,
              backgroundColor: `hsl(${panelHue}, 18%, 14%)`,
              border: `1.5px solid hsla(${panelHue}, 40%, 60%, 0.20)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {proxiedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proxiedAvatar} alt={displayName} crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 22, lineHeight: 1 }}>{displayEmoji}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 16, fontWeight: 700, color: "#fff",
                letterSpacing: "-0.03em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{displayName}</p>
              {bio && (
                <p style={{
                  fontSize: 10.5, color: "rgba(255,255,255,0.34)",
                  marginTop: 2, lineHeight: 1.4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{bio}</p>
              )}
            </div>
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, backgroundColor: separatorColor, marginBottom: 18 }} />

          {/* 장르 뱃지 */}
          {topGenres.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontSize: 8.5, color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.13em", fontWeight: 600, marginBottom: 8,
              }}>GENRE</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {topGenres.slice(0, 3).map(g => {
                  const gColor = GENRE_COLOR[g] ?? "#94a3b8";
                  return (
                    <span key={g} style={{
                      fontSize: 11, fontWeight: 600,
                      backgroundColor: `${gColor}20`,
                      color: gColor,
                      border: `1px solid ${gColor}40`,
                      borderRadius: 4,
                      padding: "3px 9px",
                    }}>{g}</span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 구분선 */}
          {topReview && (
            <div style={{ height: 1, backgroundColor: separatorColor, marginBottom: 18 }} />
          )}

          {/* 한줄 소감 quote — 커버 썸네일로 어느 앨범인지 명확히 */}
          {topReview && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {/* 앨범 커버 썸네일 */}
                <div style={{
                  width: 46, height: 46, flexShrink: 0,
                  borderRadius: 5, overflow: "hidden",
                  backgroundColor: `hsl(${panelHue}, 18%, 14%)`,
                }}>
                  {proxiedQuoteCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxiedQuoteCover} alt={topReview.albumTitle} crossOrigin="anonymous"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 20, color: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>♪</span>
                  )}
                </div>

                {/* 텍스트 영역 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 앨범명 + 점수 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <p style={{
                      fontSize: 10, color: "rgba(255,255,255,0.36)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      flex: 1, marginRight: 8,
                    }}>{topReview.albumTitle}</p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                      color: scoreColor(topReview.score),
                    }}>★ {topReview.score}</span>
                  </div>
                  {/* 한줄 소감 */}
                  <p style={{
                    fontSize: 11.5, fontStyle: "italic",
                    color: "rgba(255,255,255,0.60)",
                    lineHeight: 1.62, letterSpacing: "-0.01em",
                    wordBreak: "break-word",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    &ldquo;{topReview.text}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 구분선 */}
          <div style={{ height: 1, backgroundColor: separatorColor, marginBottom: 18 }} />

          {/* 주요 통계 — TOTAL + AVG */}
          <div style={{ display: "flex", gap: 32, alignItems: "flex-end" }}>
            <div>
              <p style={{
                fontSize: 9, color: "rgba(255,255,255,0.24)",
                letterSpacing: "0.12em", fontWeight: 600, marginBottom: 1,
              }}>TOTAL</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, lineHeight: 1 }}>
                <span style={{
                  fontSize: 64, fontWeight: 900, fontStyle: "italic",
                  fontFamily: BARLOW, letterSpacing: "-0.03em", lineHeight: 1,
                  color: accentColor,
                }}>{total}</span>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1 }}>장</span>
              </div>
            </div>
            {avgDisplay !== null && (
              <div>
                <p style={{
                  fontSize: 9, color: "rgba(255,255,255,0.24)",
                  letterSpacing: "0.12em", fontWeight: 600, marginBottom: 1,
                }}>AVG</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, lineHeight: 1 }}>
                  <span style={{
                    fontSize: 52, fontWeight: 900, fontStyle: "italic",
                    fontFamily: BARLOW, letterSpacing: "-0.03em", lineHeight: 1,
                    color: avgColor,
                  }}>{avgDisplay}</span>
                  <span style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", lineHeight: 1 }}>점</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 여백 */}
        <div style={{ flex: 1 }} />

        {/* 명반 커버 strip — 정사각형 컨테이너, 잘림 없음 */}
        {stripCovers.length > 0 && (
          <div style={{ display: "flex", gap: 3, marginBottom: 0 }}>
            {stripCovers.map((cover, i) => (
              <div key={i} style={{
                width: coverSize, height: coverSize, flexShrink: 0,
                backgroundColor: `hsl(${panelHue}, 18%, 10%)`,
                overflow: "hidden",
              }}>
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" crossOrigin="anonymous"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 24, color: "rgba(255,255,255,0.08)" }}>♪</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 푸터 */}
        <div style={{ padding: "10px 22px 20px" }}>
          <p style={{
            fontSize: 10, fontWeight: 700,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.10em",
          }}>아차청음사</p>
        </div>
      </div>
    </div>
  );
}
