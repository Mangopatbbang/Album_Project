"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AlbumModal from "@/components/album/AlbumModal";
import ArtistModal from "@/components/album/ArtistModal";
import type { AlbumStat } from "@/lib/stats";
import { AlbumWithRatings } from "@/types";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import { GENRE_COLOR } from "@/lib/bio";
import FilterSelect from "@/components/ui/FilterSelect";
import { trackFeatureClick } from "@/lib/track";

const TOP_N = 5;
const MEDAL = ["🥇", "🥈", "🥉"];

function toAlbumWithRatings(a: AlbumStat): AlbumWithRatings {
  return {
    id: a.id,
    title: a.title,
    artist: a.artist,
    artist_display: a.artist_display,
    genre: a.genre ?? undefined,
    cover_url: a.cover_url ?? undefined,
    spotify_id: a.spotify_id ?? undefined,
    ratings: [],
  };
}

// ─── SectionPopup ────────────────────────────────────────────────────────────
function SectionPopup({
  label,
  list,
  onClose,
  onAlbumClick,
  onArtistClick,
}: {
  label: string;
  list: AlbumStat[];
  onClose: () => void;
  onAlbumClick: (a: AlbumStat) => void;
  onArtistClick: (artist: { name: string; display: string }) => void;
}) {
  const closingRef = useRef(false);
  useEffect(() => {
    const doClose = () => {
      if (closingRef.current) return;
      closingRef.current = true;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") doClose(); };
    document.addEventListener("keydown", onKey);
    window.history.pushState({ popupOpen: true }, "");
    const onPop = () => doClose();
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.popupOpen) window.history.back();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          width: "100%", maxWidth: 560,
          maxHeight: "80dvh",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "modalIn 0.18s ease-out",
        }}
      >
        <div style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: GENRE_COLOR[label] ?? "var(--text)" }}>
              {label}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{list.length}장</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 0" }}>
          {list.map((album, idx) => (
            <div
              key={album.id}
              onClick={() => { onClose(); onAlbumClick(album); }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 24px", minHeight: 44,
                cursor: "pointer",
                borderBottom: idx < list.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background 0.12s",
              }}
              className="hover:bg-[var(--bg-elevated)]"
            >
              <span style={{ color: "var(--text-muted)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{
                position: "relative", width: 40, height: 40, borderRadius: 5, overflow: "hidden", flexShrink: 0,
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              }}>
                {album.cover_url
                  ? <Image fill sizes="40px" src={album.cover_url} alt={album.title} style={{ objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14, color: "var(--text-muted)" }}>♪</span>
                    </div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {album.title}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span
                    onClick={(e) => { e.stopPropagation(); onClose(); onArtistClick({ name: album.artist, display: album.artist_display ?? album.artist }); }}
                    style={{ cursor: "pointer" }}
                    className="hover:underline"
                  >
                    {album.artist_display ?? album.artist}
                  </span>
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <p style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 13 }}>{album.avg.toFixed(1)}</p>
                <p style={{ color: "var(--text-muted)", fontSize: 10 }}>{album.count}명</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SectionGrid (연도별·장르별 미리보기에서 재활용) ────────────────────────
function SectionGrid({
  label,
  list,
  onAlbumClick,
  onMoreClick,
  onArtistClick,
}: {
  label: string;
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
  onMoreClick: () => void;
  onArtistClick: (artist: { name: string; display: string }) => void;
}) {
  const top = list.slice(0, TOP_N);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        {(() => { const gColor = GENRE_COLOR[label]; return (
          <h3 style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", ...(gColor ? { color: gColor } : { color: "var(--text)" }) }}>
            {label}
          </h3>
        ); })()}
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{list.length}장</span>
        {list.length > TOP_N && (
          <button
            onClick={onMoreClick}
            style={{
              marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 11, fontWeight: 600,
              padding: "2px 6px", borderRadius: 4,
              textDecoration: "underline", textUnderlineOffset: 2,
            }}
          >
            더보기 →
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2.5 sm:overflow-x-auto sm:pb-1">
        {top.map((album, idx) => (
          <div
            key={album.id}
            style={{ cursor: "pointer" }}
            className={`${idx >= 3 ? "hidden sm:block sm:flex-none sm:w-[90px]" : "sm:flex-shrink-0 sm:flex-none sm:w-[90px]"} transition-transform hover:scale-[1.04] active:scale-[0.96]`}
            onClick={() => onAlbumClick(album)}
          >
            <div
              style={{
                position: "relative", borderRadius: 6, overflow: "hidden",
                backgroundColor: "var(--bg-elevated)",
                border: `1px solid ${glowBorder(album.avg)}`,
                boxShadow: glowShadow(album.avg),
              }}
              className="w-full aspect-square sm:aspect-auto sm:w-[90px] sm:h-[90px]"
            >
              {album.cover_url
                ? <Image fill sizes="(max-width: 640px) 25vw, 90px" src={album.cover_url} alt={album.title} style={{ objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 24, color: "var(--text-muted)" }}>♪</span>
                  </div>
              }
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5, gap: 4 }}>
              <span className="text-[10px]" style={{ color: "var(--text-muted)", fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
              <span className="text-[13px] sm:text-[11px]" style={{ color: scoreColor(album.avg), fontWeight: 700, flexShrink: 0 }}>{album.avg.toFixed(1)}</span>
            </div>
            <p className="text-[12px] sm:text-[11px]" style={{ color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.title}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              <p className="text-[11px] sm:text-[10px]" style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                <span
                  onClick={(e) => { e.stopPropagation(); onArtistClick({ name: album.artist, display: album.artist_display ?? album.artist }); }}
                  style={{ cursor: "pointer" }}
                  className="hover:underline"
                >
                  {album.artist_display ?? album.artist}
                </span>
              </p>
              <SpotifyAttribution spotifyId={album.spotify_id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ArtistSection ───────────────────────────────────────────────────────────
function ArtistSection({
  artist,
  list,
  onAlbumClick,
  onArtistClick,
}: {
  artist: string;
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
  onArtistClick: (artist: { name: string; display: string }) => void;
}) {
  const artistAvg = list.reduce((s, a) => s + a.avg, 0) / list.length;
  return (
    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h3
          onClick={() => onArtistClick({ name: artist, display: list[0]?.artist_display ?? artist })}
          style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", cursor: "pointer" }}
          className="hover:underline"
        >
          {list[0]?.artist_display ?? artist}
        </h3>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{list.length}장</span>
        <span style={{ color: scoreColor(artistAvg), fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>
          avg {artistAvg.toFixed(2)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {list.map((album) => (
          <div
            key={album.id}
            style={{ flexShrink: 0, cursor: "pointer" }}
            className="w-[84px] sm:w-[80px] transition-transform active:scale-[0.93]"
            onClick={() => onAlbumClick(album)}
          >
            <div
              style={{
                borderRadius: 6, overflow: "hidden",
                backgroundColor: "var(--bg-elevated)",
                border: `1px solid ${glowBorder(album.avg)}`,
                boxShadow: glowShadow(album.avg),
              }}
              className="w-[84px] h-[84px] sm:w-[80px] sm:h-[80px] transition-opacity hover:opacity-80"
            >
              {album.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18, color: "var(--text-muted)" }}>♪</span>
                  </div>
              }
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, gap: 4 }}>
              <span style={{ color: scoreColor(album.avg), fontSize: 10, fontWeight: 700 }}>{album.avg.toFixed(1)}</span>
              <SpotifyAttribution spotifyId={album.spotify_id} />
            </div>
            <p style={{ color: "var(--text)", fontSize: 10, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RankedTile (2~5위 클립보드 영역) ────────────────────────────────────────
function RankedTile({
  album,
  rank,
  size,
  onAlbumClick,
  onArtistClick,
}: {
  album: AlbumStat;
  rank: number;
  size: "lg" | "md" | "sm";
  onAlbumClick: (a: AlbumStat) => void;
  onArtistClick: (a: { name: string; display: string }) => void;
}) {
  const isMedal = rank <= 3;
  const coverClass =
    size === "lg" ? "w-[88px] h-[88px] sm:w-[110px] sm:h-[110px]" :
    size === "md" ? "w-[76px] h-[76px] sm:w-[94px] sm:h-[94px]" :
                   "w-[64px] h-[64px] sm:w-[80px] sm:h-[80px]";
  const wrapClass =
    size === "lg" ? "w-[88px] sm:w-[110px]" :
    size === "md" ? "w-[76px] sm:w-[94px]" :
                   "w-[64px] sm:w-[80px]";
  const titleSize = size === "lg" ? 12 : size === "md" ? 11 : 10;

  return (
    <div
      style={{ flexShrink: 0, cursor: "pointer" }}
      className={`${wrapClass} transition-transform active:scale-[0.93]`}
      onClick={() => onAlbumClick(album)}
    >
      <div
        style={{
          borderRadius: 6, overflow: "hidden",
          backgroundColor: "var(--bg-elevated)",
          border: `1px solid ${glowBorder(album.avg)}`,
          boxShadow: glowShadow(album.avg),
        }}
        className={`${coverClass} transition-opacity hover:opacity-80`}
      >
        {album.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img loading="lazy" src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 20, color: "var(--text-muted)" }}>♪</span>
            </div>
        }
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5, gap: 4 }}>
        <span style={{ fontSize: isMedal ? 14 : 10, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>
          {isMedal
            ? MEDAL[rank - 1]
            : <span style={{ color: "var(--text-muted)" }}>{rank}</span>
          }
        </span>
        <span style={{ color: scoreColor(album.avg), fontSize: size === "lg" ? 12 : 11, fontWeight: 700, flexShrink: 0 }}>
          {album.avg.toFixed(1)}
        </span>
      </div>
      <p style={{ color: "var(--text)", fontSize: titleSize, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {album.title}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: titleSize - 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <span
          onClick={(e) => { e.stopPropagation(); onArtistClick({ name: album.artist, display: album.artist_display ?? album.artist }); }}
          style={{ cursor: "pointer" }}
          className="hover:underline"
        >
          {album.artist_display ?? album.artist}
        </span>
      </p>
    </div>
  );
}

// ─── HeroCard (1위 전체 너비 배너) ───────────────────────────────────────────
function HeroCard({
  album,
  onAlbumClick,
  onArtistClick,
}: {
  album: AlbumStat;
  onAlbumClick: (a: AlbumStat) => void;
  onArtistClick: (a: { name: string; display: string }) => void;
}) {
  return (
    <div
      onClick={() => onAlbumClick(album)}
      style={{
        position: "relative", borderRadius: 12, overflow: "hidden",
        cursor: "pointer", display: "flex", minHeight: 140,
        border: "1px solid rgba(232, 213, 163, 0.18)",
        boxShadow: "0 0 32px rgba(232, 213, 163, 0.06)",
        marginBottom: 10, transition: "opacity 0.15s",
      }}
      className="hover:opacity-90 active:scale-[0.99]"
    >
      {/* blur 배경 */}
      {album.cover_url && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={album.cover_url} alt=""
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              filter: "blur(28px) saturate(0.5) brightness(0.25)",
              transform: "scale(1.15)",
            }}
          />
        </div>
      )}
      {/* 그라디언트 오버레이 */}
      <div style={{
        position: "absolute", inset: 0,
        background: album.cover_url
          ? "linear-gradient(110deg, rgba(30,22,12,0.78) 0%, rgba(24,22,20,0.9) 100%)"
          : "var(--bg-card)",
      }} />
      {/* 앨범 커버 */}
      <div
        style={{ position: "relative", zIndex: 1, flexShrink: 0, boxShadow: "4px 0 20px rgba(0,0,0,0.35)" }}
        className="w-[120px] sm:w-[160px]"
      >
        {album.cover_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: "var(--text-muted)" }}>♪</div>
        }
      </div>
      {/* 정보 */}
      <div style={{
        position: "relative", zIndex: 1, flex: 1,
        padding: "18px 20px", display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 4, minWidth: 0,
      }}>
        <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 2 }}>🥇</div>
        <p style={{
          fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em",
          color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }} className="sm:text-xl">
          {album.title}
        </p>
        <p
          onClick={(e) => {
            e.stopPropagation();
            onArtistClick({ name: album.artist, display: album.artist_display ?? album.artist });
          }}
          style={{ fontSize: 12, color: "var(--text-sub)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          className="hover:underline"
        >
          {album.artist_display ?? album.artist}
          {album.year ? ` · ${album.year.slice(0, 4)}` : ""}
          {album.genre ? ` · ${album.genre}` : ""}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.05em", color: scoreColor(album.avg) }} className="sm:text-4xl">
            {album.avg.toFixed(1)}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {album.count}명 평가
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── WorstSection (이건 좀) ───────────────────────────────────────────────────
function WorstSection({
  list,
  onAlbumClick,
  onMoreClick,
}: {
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
  onMoreClick: () => void;
}) {
  const preview = list.slice(0, 3);
  return (
    <div style={{
      border: "1px solid rgba(224, 80, 80, 0.2)",
      borderRadius: 10,
      background: "rgba(224, 80, 80, 0.04)",
      padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--error)", fontWeight: 700 }}>▼ 이건 좀</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>평균 최하위 · 평점 2명 이상</span>
        {list.length > 3 && (
          <button
            onClick={onMoreClick}
            style={{
              marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 10, fontWeight: 600,
              textDecoration: "underline", textUnderlineOffset: 2,
            }}
          >
            전체 보기 ({list.length}장) →
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {preview.map((album, idx) => (
          <div
            key={album.id}
            onClick={() => onAlbumClick(album)}
            style={{ flexShrink: 0, cursor: "pointer", filter: "saturate(0.4) brightness(0.85)" }}
            className="w-[64px] sm:w-[80px] transition-transform active:scale-[0.93]"
          >
            <div
              style={{ borderRadius: 6, overflow: "hidden", border: "1px solid rgba(224,80,80,0.2)", background: "var(--bg-elevated)" }}
              className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px]"
            >
              {album.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img loading="lazy" src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>♪</div>
              }
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{idx + 1}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#e07878" }}>{album.avg.toFixed(1)}</span>
            </div>
            <p style={{ fontSize: 9, color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── YearSection ──────────────────────────────────────────────────────────────
function YearSection({
  sections,
  onAlbumClick,
  onMoreClick,
  onArtistClick,
}: {
  sections: [string, AlbumStat[]][];
  onAlbumClick: (a: AlbumStat) => void;
  onMoreClick: (label: string, list: AlbumStat[]) => void;
  onArtistClick: (a: { name: string; display: string }) => void;
}) {
  // 내림차순 정렬 (최신 연도 먼저)
  const sorted = useMemo(
    () => [...sections].sort(([a], [b]) => b.localeCompare(a)),
    [sections]
  );
  const [selected, setSelected] = useState<string>(sorted[0]?.[0] ?? "");

  // sections 변경 시 첫 번째로 리셋 (regionFilter 바뀔 때 key prop으로 처리)
  const currentList = sorted.find(([y]) => y === selected)?.[1] ?? sorted[0]?.[1] ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>연도별</h2>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sorted.length}개 연도</span>
      </div>
      {/* 연도 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {sorted.map(([year]) => (
          <button
            key={year}
            onClick={() => setSelected(year)}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: selected === year ? "var(--accent)" : "var(--bg-elevated)",
              color: selected === year ? "var(--bg)" : "var(--text-muted)",
              border: `1px solid ${selected === year ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            {year}
          </button>
        ))}
      </div>
      {/* 선택된 연도 SectionGrid */}
      {currentList.length > 0 && (
        <SectionGrid
          label={selected}
          list={currentList}
          onAlbumClick={onAlbumClick}
          onMoreClick={() => onMoreClick(selected, currentList)}
          onArtistClick={onArtistClick}
        />
      )}
    </div>
  );
}

// ─── GenreSection ─────────────────────────────────────────────────────────────
function GenreSection({
  sections,
  onAlbumClick,
  onMoreClick,
  onArtistClick,
}: {
  sections: [string, AlbumStat[]][];
  onAlbumClick: (a: AlbumStat) => void;
  onMoreClick: (label: string, list: AlbumStat[]) => void;
  onArtistClick: (a: { name: string; display: string }) => void;
}) {
  const [selected, setSelected] = useState<string>(sections[0]?.[0] ?? "");
  const currentList = sections.find(([g]) => g === selected)?.[1] ?? sections[0]?.[1] ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>장르별</h2>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sections.length}개 장르</span>
      </div>
      {/* 장르 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {sections.map(([genre]) => {
          const gColor = GENRE_COLOR[genre];
          const isSelected = selected === genre;
          return (
            <button
              key={genre}
              onClick={() => setSelected(genre)}
              style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: isSelected
                  ? (gColor ?? "var(--accent)")
                  : "var(--bg-elevated)",
                color: isSelected ? "var(--bg)" : (gColor ?? "var(--text-muted)"),
                border: `1px solid ${isSelected ? (gColor ?? "var(--accent)") : "var(--border)"}`,
                transition: "all 0.12s",
              }}
            >
              {genre}
            </button>
          );
        })}
      </div>
      {/* 선택된 장르 SectionGrid */}
      {currentList.length > 0 && (
        <SectionGrid
          label={selected}
          list={currentList}
          onAlbumClick={onAlbumClick}
          onMoreClick={() => onMoreClick(selected, currentList)}
          onArtistClick={onArtistClick}
        />
      )}
    </div>
  );
}

// ─── BestPageClient ───────────────────────────────────────────────────────────
export default function BestPageClient({
  yearData,
  genreData,
  artistData,
  allRanked,
  domesticRanked,
  foreignRanked,
  worstRanked,
  domesticWorstRanked,
  foreignWorstRanked,
  // initialView는 URL 하위 호환을 위해 받지만 스크롤 구조에서는 사용하지 않음
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialView: _initialView,
}: {
  yearData: [string, AlbumStat[]][];
  genreData: [string, AlbumStat[]][];
  artistData: [string, AlbumStat[]][];
  allRanked: AlbumStat[];
  domesticRanked: AlbumStat[];
  foreignRanked: AlbumStat[];
  worstRanked: AlbumStat[];
  domesticWorstRanked: AlbumStat[];
  foreignWorstRanked: AlbumStat[];
  initialView: string;
}) {
  const [regionFilter, setRegionFilter] = useState<"전체" | "국내" | "해외">("전체");
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);
  // "best" | "worst" : 통합 랭킹 / 이건 좀 전체 팝업
  const [openFullList, setOpenFullList] = useState<"best" | "worst" | null>(null);
  // 연도별·장르별 더보기 팝업
  const [openSectionData, setOpenSectionData] = useState<{ label: string; list: AlbumStat[] } | null>(null);

  // 지역별 데이터 분기
  const rankedList =
    regionFilter === "국내" ? domesticRanked :
    regionFilter === "해외" ? foreignRanked :
    allRanked;

  const worstList =
    regionFilter === "국내" ? domesticWorstRanked :
    regionFilter === "해외" ? foreignWorstRanked :
    worstRanked;

  // 지역 필터 적용된 섹션 데이터
  const filteredYearData = useMemo(() => {
    if (regionFilter === "전체") return yearData;
    return yearData
      .map(([label, list]) => [label, list.filter((a) => a.region === regionFilter)] as [string, AlbumStat[]])
      .filter(([, list]) => list.length > 0);
  }, [yearData, regionFilter]);

  const filteredGenreData = useMemo(() => {
    if (regionFilter === "전체") return genreData;
    return genreData
      .map(([label, list]) => [label, list.filter((a) => a.region === regionFilter)] as [string, AlbumStat[]])
      .filter(([, list]) => list.length > 0);
  }, [genreData, regionFilter]);

  const filteredArtistData = useMemo(() => {
    if (regionFilter === "전체") return artistData;
    return artistData
      .map(([label, list]) => [label, list.filter((a) => a.region === regionFilter)] as [string, AlbumStat[]])
      .filter(([, list]) => list.length > 0);
  }, [artistData, regionFilter]);

  const [hero, ...restRanked] = rankedList;
  const clipList = restRanked.slice(0, 4); // 2~5위

  return (
    <>
      {/* ── 지역 필터 — 데스크탑 ── */}
      <div data-tour="best-tabs" className="hidden sm:flex" style={{ gap: 6, marginBottom: 24 }}>
        {(["전체", "국내", "해외"] as const).map((r) => (
          <button
            key={r}
            onClick={() => { setRegionFilter(r); trackFeatureClick("청음감_지역필터", r); }}
            style={{
              padding: "5px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              backgroundColor: regionFilter === r ? "var(--accent)" : "var(--bg-elevated)",
              color: regionFilter === r ? "var(--bg)" : "var(--text-sub)",
              border: `1px solid ${regionFilter === r ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* ── 지역 필터 — 모바일 ── */}
      <div data-tour="best-tabs-mobile" className="sm:hidden" style={{ marginBottom: 20 }}>
        <FilterSelect
          value={regionFilter}
          onChange={(v) => { setRegionFilter(v as "전체" | "국내" | "해외"); trackFeatureClick("청음감_지역필터", v); }}
          options={[
            { value: "전체", label: "전체" },
            { value: "국내", label: "국내" },
            { value: "해외", label: "해외" },
          ]}
          title="지역"
          feature="청음감_지역필터"
          active={regionFilter !== "전체"}
        />
      </div>

      {/* ── 통합 랭킹 섹션 ── */}
      <section data-tour="best-main" style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>통합 랭킹</h2>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>평점 2명 이상 · {rankedList.length}장</span>
        </div>

        {hero ? (
          <>
            <HeroCard
              album={hero}
              onAlbumClick={(a) => setSelectedAlbum(a)}
              onArtistClick={(a) => setArtistModal(a)}
            />
            {/* 2열: 클립보드(2~5위) | 이건 좀 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6" style={{ marginTop: 10 }}>
              {/* 좌: 2~5위 + 전체 보기 */}
              <div>
                {clipList.length > 0 && (
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    {clipList.map((album, idx) => (
                      <RankedTile
                        key={album.id}
                        album={album}
                        rank={idx + 2}
                        size={idx === 0 ? "md" : "sm"}
                        onAlbumClick={(a) => setSelectedAlbum(a)}
                        onArtistClick={(a) => setArtistModal(a)}
                      />
                    ))}
                  </div>
                )}
                {rankedList.length > 5 && (
                  <button
                    onClick={() => setOpenFullList("best")}
                    style={{
                      marginTop: 14, padding: "7px 16px",
                      borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: "none", border: "1px solid var(--border)",
                      color: "var(--text-muted)", cursor: "pointer",
                      transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--text-muted)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >
                    전체 순위 보기 ({rankedList.length}장) →
                  </button>
                )}
              </div>
              {/* 우: 이건 좀 */}
              {worstList.length > 0 && (
                <WorstSection
                  list={worstList}
                  onAlbumClick={(a) => setSelectedAlbum(a)}
                  onMoreClick={() => setOpenFullList("worst")}
                />
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 26, marginBottom: 10 }}>♪</p>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>아직 청음 기록이 없어요</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>앨범을 평가하면<br />이 지역 명반 목록이 채워져요</p>
          </div>
        )}
      </section>

      {/* ── 구분선 ── */}
      <div style={{ height: 1, backgroundColor: "var(--border)", margin: "36px 0" }} />

      {/* ── 연도별 + 장르별 — 2열 ── */}
      {(filteredYearData.length > 0 || filteredGenreData.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10" style={{ marginBottom: 36 }}>
          {filteredYearData.length > 0 && (
            <YearSection
              key={`year-${regionFilter}`}
              sections={filteredYearData}
              onAlbumClick={(a) => setSelectedAlbum(a)}
              onMoreClick={(label, list) => setOpenSectionData({ label, list })}
              onArtistClick={(a) => setArtistModal(a)}
            />
          )}
          {filteredGenreData.length > 0 && (
            <GenreSection
              key={`genre-${regionFilter}`}
              sections={filteredGenreData}
              onAlbumClick={(a) => setSelectedAlbum(a)}
              onMoreClick={(label, list) => setOpenSectionData({ label, list })}
              onArtistClick={(a) => setArtistModal(a)}
            />
          )}
        </div>
      )}

      {/* ── 아티스트별 섹션 ── */}
      {filteredArtistData.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>아티스트별</h2>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>2장 이상 · {filteredArtistData.length}팀</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {filteredArtistData.map(([artist, list]) => (
              <ArtistSection
                key={artist}
                artist={artist}
                list={list}
                onAlbumClick={(a) => setSelectedAlbum(a)}
                onArtistClick={(a) => setArtistModal(a)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 팝업: 통합 랭킹 / 이건 좀 전체 보기 ── */}
      {openFullList && (
        <SectionPopup
          label={openFullList === "best"
            ? `통합 랭킹 (${rankedList.length}장)`
            : `이건 좀 (${worstList.length}장)`
          }
          list={openFullList === "best" ? rankedList : worstList}
          onClose={() => setOpenFullList(null)}
          onAlbumClick={(a) => setSelectedAlbum(a)}
          onArtistClick={(a) => setArtistModal(a)}
        />
      )}

      {/* ── 팝업: 연도별·장르별 더보기 ── */}
      {openSectionData && (
        <SectionPopup
          label={openSectionData.label}
          list={openSectionData.list}
          onClose={() => setOpenSectionData(null)}
          onAlbumClick={(a) => setSelectedAlbum(a)}
          onArtistClick={(a) => setArtistModal(a)}
        />
      )}

      {/* ── 앨범 모달 ── */}
      {selectedAlbum && (
        <AlbumModal
          album={toAlbumWithRatings(selectedAlbum)}
          onClose={() => setSelectedAlbum(null)}
          source="best"
          handleHistory
        />
      )}

      {/* ── 아티스트 모달 ── */}
      {artistModal && (
        <ArtistModal
          artistName={artistModal.name}
          displayName={artistModal.display}
          onClose={() => setArtistModal(null)}
          onAlbumClick={(album) => {
            setArtistModal(null);
            setSelectedAlbum({
              id: album.id,
              title: album.title,
              artist: album.artist,
              artist_display: album.artist_display ?? album.artist,
              year: album.release_date?.slice(0, 4) ?? null,
              release_date: null,
              genre: album.genre ?? null,
              cover_url: album.cover_url ?? null,
              spotify_id: album.spotify_id ?? null,
              avg: parseFloat(album.avg ?? "0"),
              count: album.ratings.length,
              variance: 0,
            });
          }}
          source="best"
          handleHistory
        />
      )}
    </>
  );
}
