"use client";

import { useMemo, useState } from "react";
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

function HiddenGemsBar({
  gems,
  onAlbumClick,
}: {
  gems: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (gems.length === 0) return null;

  return (
    <div style={{ position: "relative", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span style={{
        color: "var(--text-muted)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.1em", flexShrink: 0, opacity: 0.55,
        whiteSpace: "nowrap",
      }}>
        미발견 명반
      </span>
      <div style={{ display: "flex", gap: 3, minWidth: 0, overflowX: "auto" }} className="no-scrollbar">
        {gems.map((album, i) => {
          const isHovered = hoveredIdx === i;
          const isFirst = i < 2;
          const isLast = i >= gems.length - 2;
          const popupLeft: React.CSSProperties =
            isFirst ? { left: 0 } :
            isLast  ? { right: 0 } :
            { left: "50%", transform: "translateX(-50%)" };

          return (
            <div
              key={album.id}
              style={{ position: "relative", flexShrink: 0, zIndex: isHovered ? 20 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* 커버 */}
              <div
                onClick={() => onAlbumClick(album)}
                className="w-10 h-10 sm:w-[34px] sm:h-[34px]"
                style={{
                  position: "relative", borderRadius: 4, overflow: "hidden",
                  cursor: "pointer", backgroundColor: "var(--bg-elevated)",
                  border: `1px solid ${isHovered ? "rgba(232,213,163,0.6)" : "var(--border)"}`,
                  transition: "border-color 0.12s",
                  flexShrink: 0,
                }}
              >
                {album.cover_url ? (
                  <Image
                    src={album.cover_url}
                    alt={album.title}
                    fill
                    sizes="40px"
                    style={{
                      objectFit: "cover",
                      transition: "transform 0.2s ease",
                      transform: isHovered ? "scale(1.18)" : "scale(1)",
                    }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>♪</span>
                  </div>
                )}
              </div>

              {/* 모바일 전용: 커버 아래 제목 텍스트 (데스크탑에서 hidden) */}
              <span className="hgem-label" style={{
                fontSize: 8, color: "var(--text-muted)", fontWeight: 500,
                maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                lineHeight: 1, textAlign: "center",
              }}>
                {album.title}
              </span>

              {/* hover 팝업 (터치 기기에서 CSS로 숨김) */}
              {isHovered && (
                <div className="hgem-popup" style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  ...popupLeft,
                  zIndex: 100,
                  width: 116,
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 7,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
                  pointerEvents: "none",
                  animation: "fadeIn 0.1s ease-out",
                }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 4, overflow: "hidden", backgroundColor: "var(--bg-elevated)", marginBottom: 6 }}>
                    {album.cover_url ? (
                      <Image fill sizes="120px" src={album.cover_url} alt={album.title} style={{ objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 22, color: "var(--text-muted)" }}>♪</span>
                      </div>
                    )}
                  </div>
                  <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {album.title}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                    {album.artist_display ?? album.artist}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ color: scoreColor(album.avg), fontSize: 11, fontWeight: 700 }}>{album.avg.toFixed(1)}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 9 }}>{album.count}명 평가</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

// 섹션 전체 목록 팝업
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
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4,
            }}
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
                padding: "10px 24px",
                minHeight: 44,
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
                  <span onClick={(e) => { e.stopPropagation(); onClose(); onArtistClick({ name: album.artist, display: album.artist_display ?? album.artist }); }} style={{ cursor: "pointer" }} className="hover:underline">{album.artist_display ?? album.artist}</span>
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <p style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 13 }}>
                  {album.avg.toFixed(1)}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 10 }}>{album.count}명</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
        <h2 style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", ...(gColor ? { color: gColor } : { color: "var(--text)" }) }}>
          {label}
        </h2>
        ); })()}
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{list.length}장</span>
        {list.length > 3 && (
          <button
            onClick={onMoreClick}
            className={list.length <= TOP_N ? "sm:hidden" : ""}
            style={{
              marginLeft: "auto",
              background: "none", border: "none", cursor: "pointer",
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
            <div style={{
              position: "relative",
              borderRadius: 6,
              overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
              border: `1px solid ${glowBorder(album.avg)}`,
              boxShadow: glowShadow(album.avg),
              transition: "box-shadow 0.15s",
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
                <span onClick={(e) => { e.stopPropagation(); onArtistClick({ name: album.artist, display: album.artist_display ?? album.artist }); }} style={{ cursor: "pointer" }} className="hover:underline">{album.artist_display ?? album.artist}</span>
              </p>
              <SpotifyAttribution spotifyId={album.spotify_id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const artistAvg = (list.reduce((s, a) => s + a.avg, 0) / list.length);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2
          onClick={() => onArtistClick({ name: artist, display: list[0]?.artist_display ?? artist })}
          style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", cursor: "pointer" }}
          className="hover:underline"
        >
          {list[0]?.artist_display ?? artist}
        </h2>
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
            <div style={{
              borderRadius: 6, overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
              border: `1px solid ${glowBorder(album.avg)}`,
              boxShadow: glowShadow(album.avg),
              transition: "opacity 0.15s",
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
          transition: "opacity 0.15s",
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

function RankedGrid({
  list,
  onAlbumClick,
  onArtistClick,
}: {
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
  onArtistClick: (a: { name: string; display: string }) => void;
}) {
  if (list.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p style={{ fontSize: 26, marginBottom: 10 }}>♪</p>
        <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>아직 청음 기록이 없어요</p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>앨범을 평가하면<br />이 지역 명반 목록이 채워져요</p>
      </div>
    );
  }
  const top10 = list.slice(0, 10);
  const rest = list.slice(10);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1~10위 */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {top10.map((album, idx) => (
          <RankedTile
            key={album.id}
            album={album}
            rank={idx + 1}
            size={idx < 3 ? "lg" : "md"}
            onAlbumClick={onAlbumClick}
            onArtistClick={onArtistClick}
          />
        ))}
      </div>

      {/* 구분선 */}
      {rest.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>11 — {list.length}</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {rest.map((album, idx) => (
              <RankedTile
                key={album.id}
                album={album}
                rank={idx + 11}
                size="sm"
                onAlbumClick={onAlbumClick}
                onArtistClick={onArtistClick}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ViewSections = { all: [string, AlbumStat[]][]; domestic: [string, AlbumStat[]][]; foreign: [string, AlbumStat[]][] };

export default function BestPageClient({
  yearData,
  genreData,
  artistData,
  allRanked,
  domesticRanked,
  foreignRanked,
  hiddenGems,
  initialView,
}: {
  yearData: ViewSections;
  genreData: ViewSections;
  artistData: ViewSections;
  allRanked: AlbumStat[];
  domesticRanked: AlbumStat[];
  foreignRanked: AlbumStat[];
  hiddenGems: AlbumStat[];
  initialView: string;
}) {
  const [view, setView] = useState(initialView);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [artistSort, setArtistSort] = useState<"count" | "avg">("avg");
  const [regionFilter, setRegionFilter] = useState<"전체" | "국내" | "해외">("전체");
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);

  const viewData = view === "genre" ? genreData : view === "artist" ? artistData : yearData;
  const sections =
    regionFilter === "국내" ? viewData.domestic :
    regionFilter === "해외" ? viewData.foreign :
    viewData.all;

  const rankedList =
    regionFilter === "국내" ? domesticRanked :
    regionFilter === "해외" ? foreignRanked :
    allRanked;

  const sortedArtistSections = useMemo(() => {
    if (view !== "artist" || artistSort !== "avg") return sections;
    return [...sections].sort((a, b) => {
      const avgA = a[1].reduce((s, x) => s + x.avg, 0) / a[1].length;
      const avgB = b[1].reduce((s, x) => s + x.avg, 0) / b[1].length;
      return avgB - avgA;
    });
  }, [view, sections, artistSort]);

  const openSectionData = openSection
    ? sections.find(([label]) => label === openSection)
    : null;

  return (
    <>
      {/* 모바일 필터 */}
      <div data-tour="best-tabs" className="sm:hidden flex gap-2 mb-5">
        <FilterSelect
          value={regionFilter}
          onChange={(v) => setRegionFilter(v as "전체" | "국내" | "해외")}
          options={[
            { value: "전체", label: "전체" },
            { value: "국내", label: "국내" },
            { value: "해외", label: "해외" },
          ]}
          title="지역"
          feature="청음감_지역필터"
          active={regionFilter !== "전체"}
          style={{ flex: 1, justifyContent: "center" }}
        />
        <FilterSelect
          value={view}
          onChange={(v) => { setView(v); setOpenSection(null); }}
          options={[
            { value: "all", label: "통합" },
            { value: "year", label: "연도별" },
            { value: "genre", label: "장르별" },
            { value: "artist", label: "아티스트별" },
          ]}
          title="보기 방식"
          feature="청음감_보기방식"
          active={view !== "all"}
          style={{ flex: 1, justifyContent: "center" }}
        />
        {view === "artist" && (
          <FilterSelect
            value={artistSort}
            onChange={(v) => setArtistSort(v as "count" | "avg")}
            options={[
              { value: "avg", label: "평균 평점순" },
              { value: "count", label: "음반 수순" },
            ]}
            title="정렬"
            feature="청음감_아티스트정렬"
            active={artistSort !== "avg"}
          />
        )}
      </div>

      {/* 데스크탑 필터 행: 지역(좌) + 탭/정렬(우) */}
      <div data-tour="best-main" className="hidden sm:flex" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 8, flexWrap: "wrap" }}>
        <div data-tour="best-region-filter" style={{ display: "flex", gap: 6 }}>
          {(["전체", "국내", "해외"] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRegionFilter(r); trackFeatureClick("청음감_지역필터", r); }}
              style={{
                padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
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
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {view === "artist" && (
            <>
              {(["avg", "count"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setArtistSort(s)}
                  style={{
                    padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    backgroundColor: artistSort === s ? "var(--accent)" : "var(--bg-elevated)",
                    color: artistSort === s ? "var(--bg)" : "var(--text-sub)",
                    border: `1px solid ${artistSort === s ? "var(--accent)" : "var(--border)"}`,
                    cursor: "pointer",
                  }}
                >
                  {s === "count" ? "음반 수" : "평균 평점"}
                </button>
              ))}
              <span style={{ color: "var(--border)", fontSize: 14, margin: "0 2px" }}>|</span>
            </>
          )}
          {(["all", "year", "genre", "artist"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setOpenSection(null); trackFeatureClick("청음감_보기방식", v); }}
              style={{
                padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                backgroundColor: view === v ? "var(--accent)" : "var(--bg-elevated)",
                color: view === v ? "var(--bg)" : "var(--text-sub)",
                border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {v === "all" ? "통합" : v === "year" ? "연도별" : v === "genre" ? "장르별" : "아티스트별"}
            </button>
          ))}
        </div>
      </div>

      <div key={view} style={{ animation: "fadeIn 0.18s ease-out" }}>
        {view === "all" ? (
          <RankedGrid
            list={rankedList}
            onAlbumClick={(a) => setSelectedAlbum(a)}
            onArtistClick={(a) => setArtistModal(a)}
          />
        ) : view === "artist" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {sortedArtistSections.map(([artist, list]) => (
              <ArtistSection
                key={artist}
                artist={artist}
                list={list}
                onAlbumClick={(a) => setSelectedAlbum(a)}
                onArtistClick={(a) => setArtistModal(a)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8" style={{ minWidth: 0 }}>
            {sections.map(([label, list]) => (
              <SectionGrid
                key={label}
                label={label}
                list={list}
                onAlbumClick={(a) => setSelectedAlbum(a)}
                onMoreClick={() => setOpenSection(label)}
                onArtistClick={(a) => setArtistModal(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 미발견 명반 — 얇은 바 (hover 시 팝업) */}
      <HiddenGemsBar gems={hiddenGems} onAlbumClick={(a) => setSelectedAlbum(a)} />

      {selectedAlbum && (
        <AlbumModal
          album={toAlbumWithRatings(selectedAlbum)}
          onClose={() => setSelectedAlbum(null)}
          source="best"
        />
      )}

      {openSectionData && (
        <SectionPopup
          label={openSectionData[0]}
          list={openSectionData[1]}
          onClose={() => setOpenSection(null)}
          onAlbumClick={(a) => setSelectedAlbum(a)}
          onArtistClick={(a) => setArtistModal(a)}
        />
      )}
      {artistModal && (
        <ArtistModal
          artistName={artistModal.name}
          displayName={artistModal.display}
          onClose={() => setArtistModal(null)}
          onAlbumClick={(album) => { setArtistModal(null); setSelectedAlbum({ id: album.id, title: album.title, artist: album.artist, artist_display: album.artist_display ?? album.artist, year: album.release_date?.slice(0, 4) ?? null, release_date: null, genre: album.genre ?? null, cover_url: album.cover_url ?? null, spotify_id: album.spotify_id ?? null, avg: parseFloat(album.avg ?? "0"), count: album.ratings.length, variance: 0 }); }}
          source="best"
        />
      )}
    </>
  );
}
