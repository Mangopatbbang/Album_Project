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
  favoriteArtist: { name: string; avg: string } | null;
  topReview: { text: string; albumTitle: string; coverUrl: string | null; score: number } | null;
  coverUrls: (string | null)[];
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const BARLOW = "var(--font-barlow-condensed), 'Barlow Condensed', Impact, 'Arial Narrow', sans-serif";
const PRETENDARD = "var(--font-pretendard), 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
// 커버 strip: 3장, 2px gap × 2 = 4px, (360-4)/3 ≈ 118px
const STRIP_H = 118;

export default function ProfileShareCard({
  displayName, displayEmoji, avatarUrl, bio, total, avg,
  topGenres, favoriteArtist, topReview, coverUrls, containerRef,
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
  // 구분선: 양 끝 투명 → 중앙 색상 → 투명
  const sep = `linear-gradient(to right, transparent 0%, hsla(${panelHue},50%,60%,0.20) 20%, hsla(${panelHue},50%,60%,0.20) 80%, transparent 100%)`;
  const accentColor = `hsl(${panelHue}, 68%, 64%)`;

  const avgNum = avg ? parseFloat(avg) : null;
  const avgDisplay = avgNum !== null
    ? (Number.isInteger(avgNum) ? String(avgNum) : avgNum.toFixed(1))
    : null;
  const avgColor = avgNum !== null ? scoreColor(avgNum) : "rgba(255,255,255,0.55)";

  const stripCovers = proxiedCovers.slice(0, 3);
  const hasGenreOrArtist = topGenres.length > 0 || !!favoriteArtist;

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
          filter: "blur(32px) saturate(1.6) brightness(0.32)",
          transform: "scale(1.14)",
        }} />
      )}

      {/* L1: 다크 패널 */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, backgroundColor: panelBg, opacity: 0.86 }} />

      {/* L2: 노이즈 */}
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
      <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", flexDirection: "column" }}>

        {/* Ghost watermark */}
        {total > 0 && (
          <span aria-hidden="true" style={{
            position: "absolute",
            right: -12, bottom: 55,
            fontSize: 210,
            fontFamily: BARLOW,
            fontWeight: 900, fontStyle: "italic",
            letterSpacing: "-0.05em", lineHeight: 1,
            color: accentColor,
            opacity: 0.055,
            userSelect: "none", pointerEvents: "none",
            zIndex: -1,
          }}>
            {total}
          </span>
        )}

        {/* ── 상단 커버 strip (full bleed, 정사각형) ── */}
        {stripCovers.length > 0 && (
          <div style={{ position: "relative", height: STRIP_H, flexShrink: 0, display: "flex", gap: 2 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ flex: 1, overflow: "hidden", backgroundColor: `hsl(${panelHue}, 18%, 10%)` }}>
                {stripCovers[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stripCovers[i]!} alt="" crossOrigin="anonymous"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 22, color: "rgba(255,255,255,0.07)" }}>♪</span>
                  </div>
                )}
              </div>
            ))}
            {/* 커버 → 패널 그라디언트 페이드 */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 56,
              background: `linear-gradient(to bottom, transparent 0%, ${panelBg} 100%)`,
              pointerEvents: "none",
            }} />
          </div>
        )}

        {/* ── 패널 콘텐츠 ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "18px 22px 0" }}>

          {/* 아바타 + 이름 */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              overflow: "hidden", flexShrink: 0,
              backgroundColor: `hsl(${panelHue}, 18%, 13%)`,
              border: `1.5px solid hsla(${panelHue}, 45%, 65%, 0.28)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {proxiedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proxiedAvatar} alt={displayName} crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 21, lineHeight: 1 }}>{displayEmoji}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.94)",
                letterSpacing: "-0.03em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{displayName}</p>
              {bio && (
                <p style={{
                  fontSize: 10.5, color: "rgba(255,255,255,0.32)",
                  marginTop: 2, lineHeight: 1.4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{bio}</p>
              )}
            </div>
          </div>

          {/* 구분선 */}
          {hasGenreOrArtist && <div style={{ height: 1, background: sep, marginBottom: 16 }} />}

          {/* 장르 뱃지 */}
          {topGenres.length > 0 && (
            <div style={{ marginBottom: favoriteArtist ? 10 : 0 }}>
              <p style={{
                fontSize: 8, color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.14em", fontWeight: 600, marginBottom: 7,
              }}>GENRE</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {topGenres.slice(0, 3).map(g => {
                  const gColor = GENRE_COLOR[g] ?? "#94a3b8";
                  return (
                    <span key={g} style={{
                      fontSize: 11, fontWeight: 600,
                      backgroundColor: `${gColor}1e`,
                      color: gColor,
                      border: `1px solid ${gColor}3e`,
                      borderRadius: 5,
                      padding: "3px 9px",
                      letterSpacing: "0.005em",
                    }}>{g}</span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 최애 아티스트 */}
          {favoriteArtist && (
            <div style={{ marginBottom: 0 }}>
              <p style={{
                fontSize: 8, color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.14em", fontWeight: 600, marginBottom: 5,
              }}>FAVORITE ARTIST</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: "rgba(255,255,255,0.86)",
                  letterSpacing: "-0.01em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: 180,
                }}>{favoriteArtist.name}</span>
                <span style={{
                  fontSize: 9.5, fontWeight: 600, flexShrink: 0,
                  color: scoreColor(parseFloat(favoriteArtist.avg)),
                }}>avg {favoriteArtist.avg}점</span>
              </div>
            </div>
          )}

          {/* 구분선 */}
          {topReview && <div style={{ height: 1, background: sep, margin: "16px 0" }} />}

          {/* 한줄 소감 + 앨범 커버 썸네일 */}
          {topReview && (
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <div style={{
                width: 44, height: 44, flexShrink: 0,
                borderRadius: 5, overflow: "hidden",
                backgroundColor: `hsl(${panelHue}, 18%, 13%)`,
              }}>
                {proxiedQuoteCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxiedQuoteCover} alt={topReview.albumTitle} crossOrigin="anonymous"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18, color: "rgba(255,255,255,0.12)" }}>♪</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <p style={{
                    fontSize: 9.5, color: "rgba(255,255,255,0.36)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    flex: 1, marginRight: 8, letterSpacing: "0.01em",
                  }}>{topReview.albumTitle}</p>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, flexShrink: 0,
                    color: scoreColor(topReview.score),
                    letterSpacing: "0.01em",
                  }}>★{topReview.score}</span>
                </div>
                <p style={{
                  fontSize: 11, fontStyle: "italic",
                  color: "rgba(255,255,255,0.58)",
                  lineHeight: 1.65, letterSpacing: "-0.015em",
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
          )}

          {/* 구분선 */}
          <div style={{ height: 1, background: sep, margin: "16px 0" }} />

          {/* 주요 통계 */}
          <div style={{ display: "flex", gap: 30, alignItems: "flex-end" }}>
            <div>
              <p style={{
                fontSize: 8.5, color: "rgba(255,255,255,0.22)",
                letterSpacing: "0.13em", fontWeight: 600, marginBottom: 1,
              }}>TOTAL</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, lineHeight: 1 }}>
                <span style={{
                  fontSize: 64, fontWeight: 900, fontStyle: "italic",
                  fontFamily: BARLOW, letterSpacing: "-0.03em", lineHeight: 1,
                  color: accentColor,
                }}>{total}</span>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.40)", lineHeight: 1 }}>장</span>
              </div>
            </div>
            {avgDisplay !== null && (
              <div>
                <p style={{
                  fontSize: 8.5, color: "rgba(255,255,255,0.22)",
                  letterSpacing: "0.13em", fontWeight: 600, marginBottom: 1,
                }}>AVG</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, lineHeight: 1 }}>
                  <span style={{
                    fontSize: 52, fontWeight: 900, fontStyle: "italic",
                    fontFamily: BARLOW, letterSpacing: "-0.03em", lineHeight: 1,
                    color: avgColor,
                  }}>{avgDisplay}</span>
                  <span style={{ fontSize: 16, color: "rgba(255,255,255,0.40)", lineHeight: 1 }}>점</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* 푸터 */}
          <div style={{ paddingBottom: 20 }}>
            <div style={{ height: 1, background: sep, marginBottom: 12 }} />
            <p style={{
              fontSize: 9.5, fontWeight: 700,
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.12em",
            }}>아차청음사</p>
          </div>
        </div>
      </div>
    </div>
  );
}
