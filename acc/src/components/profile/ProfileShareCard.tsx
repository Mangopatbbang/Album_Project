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
  topReview: { text: string; albumTitle: string } | null;
  coverUrls: (string | null)[];
  scoreDist: { score: number; count: number }[];
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const BARLOW = "var(--font-barlow-condensed), 'Barlow Condensed', Impact, 'Arial Narrow', sans-serif";
const PRETENDARD = "var(--font-pretendard), 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const MOSAIC_H = 220;

export default function ProfileShareCard({
  displayName, displayEmoji, avatarUrl, bio, total, avg,
  topGenres, topReview, coverUrls, scoreDist, containerRef,
}: Props) {
  const proxiedCovers = coverUrls.map(url =>
    url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : null
  );
  const proxiedAvatar = avatarUrl
    ? `/api/image-proxy?url=${encodeURIComponent(avatarUrl)}`
    : null;
  const firstCover = proxiedCovers.find(c => c !== null) ?? null;

  const [panelHue, setPanelHue] = useState(215);
  const [noiseBg, setNoiseBg] = useState("");

  useEffect(() => {
    if (!firstCover) return;
    extractDominantHue(firstCover).then(setPanelHue);
  }, [firstCover]);

  useEffect(() => { setNoiseBg(generateNoiseBg()); }, []);

  const panelBg = `hsl(${panelHue}, 30%, 6%)`;
  const separatorColor = `hsla(${panelHue}, 50%, 60%, 0.18)`;
  const accentColor = `hsl(${panelHue}, 70%, 62%)`;

  const avgNum = avg ? parseFloat(avg) : null;
  const avgDisplay = avgNum !== null
    ? (Number.isInteger(avgNum) ? String(avgNum) : avgNum.toFixed(1))
    : null;
  const avgColor = avgNum !== null ? scoreColor(avgNum) : "rgba(255,255,255,0.55)";

  const maxDistCount = Math.max(...scoreDist.map(d => d.count), 1);
  const hasDistData = scoreDist.some(d => d.count > 0);

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
      {/* L0: 블러 배경 */}
      {firstCover && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${firstCover})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(28px) saturate(1.9) brightness(0.42)",
          transform: "scale(1.14)",
        }} />
      )}

      {/* L1: 하단 다크 패널 */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 640 - MOSAIC_H,
        backgroundColor: panelBg,
        zIndex: 1,
      }} />

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
        {/* Ghost watermark: 총 청음 장수 */}
        {total > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -10, bottom: 16,
              fontSize: 200,
              fontFamily: BARLOW,
              fontWeight: 900, fontStyle: "italic",
              letterSpacing: "-0.05em", lineHeight: 1,
              color: accentColor,
              opacity: 0.07,
              userSelect: "none", pointerEvents: "none",
              zIndex: -1,
            }}
          >
            {total}
          </span>
        )}

        {/* 커버 모자이크 */}
        <div style={{
          height: MOSAIC_H, flexShrink: 0,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 2,
            width: "100%", height: "100%",
          }}>
            {[0, 1, 2, 3].map(i =>
              proxiedCovers[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={proxiedCovers[i]!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div key={i} style={{ backgroundColor: `hsl(${panelHue}, 18%, 10%)` }} />
              )
            )}
          </div>
          {/* 모자이크 → 패널 그라디언트 페이드 */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
            background: `linear-gradient(to bottom, transparent 0%, ${panelBg} 100%)`,
          }} />
        </div>

        {/* 패널 콘텐츠 */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          padding: "14px 22px 20px",
        }}>
          {/* 아바타 + 이름 + 소개글 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              overflow: "hidden", flexShrink: 0,
              backgroundColor: `hsl(${panelHue}, 18%, 13%)`,
              border: `1.5px solid hsla(${panelHue}, 40%, 60%, 0.22)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {proxiedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxiedAvatar} alt={displayName}
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 20, lineHeight: 1 }}>{displayEmoji}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 15, fontWeight: 700, color: "#fff",
                letterSpacing: "-0.03em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{displayName}</p>
              {bio && (
                <p style={{
                  fontSize: 10, color: "rgba(255,255,255,0.36)",
                  marginTop: 2, lineHeight: 1.4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{bio}</p>
              )}
            </div>
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, backgroundColor: separatorColor, marginBottom: 14 }} />

          {/* 주요 통계 — TOTAL + AVG */}
          <div style={{ display: "flex", gap: 28, alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <p style={{
                fontSize: 9, color: "rgba(255,255,255,0.26)",
                letterSpacing: "0.12em", fontWeight: 600, marginBottom: 1,
              }}>TOTAL</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, lineHeight: 1 }}>
                <span style={{
                  fontSize: 62, fontWeight: 900, fontStyle: "italic",
                  fontFamily: BARLOW,
                  letterSpacing: "-0.03em", lineHeight: 1,
                  color: accentColor,
                }}>{total}</span>
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.48)", lineHeight: 1 }}>장</span>
              </div>
            </div>

            {avgDisplay !== null && (
              <div>
                <p style={{
                  fontSize: 9, color: "rgba(255,255,255,0.26)",
                  letterSpacing: "0.12em", fontWeight: 600, marginBottom: 1,
                }}>AVG</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, lineHeight: 1 }}>
                  <span style={{
                    fontSize: 50, fontWeight: 900, fontStyle: "italic",
                    fontFamily: BARLOW,
                    letterSpacing: "-0.03em", lineHeight: 1,
                    color: avgColor,
                  }}>{avgDisplay}</span>
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,0.48)", lineHeight: 1 }}>점</span>
                </div>
              </div>
            )}
          </div>

          {/* 구분선 */}
          {topGenres.length > 0 && (
            <div style={{ height: 1, backgroundColor: separatorColor, marginBottom: 12 }} />
          )}

          {/* 장르 뱃지 */}
          {topGenres.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{
                fontSize: 8.5, color: "rgba(255,255,255,0.24)",
                letterSpacing: "0.12em", fontWeight: 600, marginBottom: 7,
              }}>GENRE</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {topGenres.slice(0, 3).map(g => {
                  const gColor = GENRE_COLOR[g] ?? "#94a3b8";
                  return (
                    <span key={g} style={{
                      fontSize: 11, fontWeight: 600,
                      backgroundColor: `${gColor}22`,
                      color: gColor,
                      border: `1px solid ${gColor}44`,
                      borderRadius: 4,
                      padding: "3px 8px",
                      letterSpacing: "0.01em",
                    }}>{g}</span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 구분선 */}
          {topReview && (
            <div style={{ height: 1, backgroundColor: separatorColor, marginBottom: 12 }} />
          )}

          {/* 한줄 소감 quote */}
          {topReview && (
            <div style={{ marginBottom: 12 }}>
              <p style={{
                fontSize: 11.5,
                fontStyle: "italic",
                color: "rgba(255,255,255,0.58)",
                lineHeight: 1.65,
                letterSpacing: "-0.01em",
                wordBreak: "break-word",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginBottom: 5,
              }}>
                &ldquo;{topReview.text}&rdquo;
              </p>
              <p style={{
                fontSize: 9, color: "rgba(255,255,255,0.24)",
                textAlign: "right", letterSpacing: "0.02em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                — {topReview.albumTitle}
              </p>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* 마이크로 점수 분포 도트 + 푸터 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hasDistData && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                {scoreDist.map(d => {
                  const size = d.count > 0
                    ? Math.max(3.5, (d.count / maxDistCount) * 10)
                    : 2.5;
                  return (
                    <div key={d.score} style={{
                      width: size, height: size, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: d.count > 0 ? scoreColor(d.score) : "rgba(255,255,255,0.08)",
                      opacity: d.count > 0 ? 0.72 : 1,
                    }} />
                  );
                })}
              </div>
            )}

            <p style={{
              fontSize: 10, fontWeight: 700,
              color: "rgba(255,255,255,0.20)",
              letterSpacing: "0.10em",
            }}>아차청음사</p>
          </div>
        </div>
      </div>
    </div>
  );
}
