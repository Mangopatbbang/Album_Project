"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AlbumModal from "@/components/album/AlbumModal";
import ArtistModal from "@/components/album/ArtistModal";
import type { AlbumStat } from "@/lib/stats";
import { AlbumWithRatings } from "@/types";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";
import { GENRE_COLOR, koGenre } from "@/lib/bio";

const TOP_N = 5;
const MEDAL = ["🥇", "🥈", "🥉"];

function toAlbumWithRatings(a: AlbumStat): AlbumWithRatings {
  return {
    id: a.id,
    title: a.title,
    artist: a.artist,
    artist_display: a.artist_display,
    year: a.year ?? undefined,
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
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: GENRE_COLOR[koGenre(label)] ?? "var(--text)" }}>
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
                width: 40, height: 40, borderRadius: 5, overflow: "hidden", flexShrink: 0,
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              }}>
                {album.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        {(() => { const gColor = GENRE_COLOR[koGenre(label)]; return (
        <h2 style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", ...(gColor ? { color: gColor } : { color: "var(--text)" }) }}>
          {label}
        </h2>
        ); })()}
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{list.length}장</span>
        {list.length > TOP_N && (
          <button
            onClick={onMoreClick}
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
      <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1">
        {top.map((album, idx) => (
          <div
            key={album.id}
            style={{ flexShrink: 0, cursor: "pointer" }}
            className="w-[84px] sm:w-[90px]"
            onClick={() => onAlbumClick(album)}
          >
            <div style={{
              borderRadius: 6,
              overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
              border: `1px solid ${glowBorder(album.avg)}`,
              boxShadow: glowShadow(album.avg),
              transition: "opacity 0.15s",
            }}
            className="w-[84px] h-[84px] sm:w-[90px] sm:h-[90px] transition-opacity hover:opacity-80"
            >
              {album.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20, color: "var(--text-muted)" }}>♪</span>
                  </div>
              }
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5, gap: 4 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
              <span style={{ color: scoreColor(album.avg), fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{album.avg.toFixed(1)}</span>
            </div>
            <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.title}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
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
                ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
          ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
      <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "60px 0", textAlign: "center" }}>
        해당 지역 청음 기록이 없습니다
      </p>
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

export default function BestPageClient({
  allSections,
  domesticSections,
  foreignSections,
  allRanked,
  domesticRanked,
  foreignRanked,
  view,
}: {
  allSections: [string, AlbumStat[]][];
  domesticSections: [string, AlbumStat[]][];
  foreignSections: [string, AlbumStat[]][];
  allRanked: AlbumStat[];
  domesticRanked: AlbumStat[];
  foreignRanked: AlbumStat[];
  view: string;
}) {
  const router = useRouter();
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [artistSort, setArtistSort] = useState<"count" | "avg">("avg");
  const [regionFilter, setRegionFilter] = useState<"전체" | "국내" | "해외">("전체");
  const [artistModal, setArtistModal] = useState<{ name: string; display: string } | null>(null);

  const sections =
    regionFilter === "국내" ? domesticSections :
    regionFilter === "해외" ? foreignSections :
    allSections;

  const rankedList =
    regionFilter === "국내" ? domesticRanked :
    regionFilter === "해외" ? foreignRanked :
    allRanked;

  const sortedArtistSections = artistSort === "avg"
    ? [...sections].sort((a, b) => {
        const avgA = a[1].reduce((s, x) => s + x.avg, 0) / a[1].length;
        const avgB = b[1].reduce((s, x) => s + x.avg, 0) / b[1].length;
        return avgB - avgA;
      })
    : sections;

  const openSectionData = openSection
    ? sections.find(([label]) => label === openSection)
    : null;

  const mobileSelectStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "7px 10px",
    fontSize: 13,
    cursor: "pointer",
    flex: 1,
  } as const;

  return (
    <>
      {/* 모바일 필터: select 2개 */}
      <div data-tour="best-tabs" className="sm:hidden flex gap-2 mb-5">
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value as "전체" | "국내" | "해외")}
          style={mobileSelectStyle}
        >
          {(["전체", "국내", "해외"] as const).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={view}
          onChange={(e) => router.push(`/best?view=${e.target.value}`)}
          style={mobileSelectStyle}
        >
          <option value="all">통합</option>
          <option value="year">연도별</option>
          <option value="genre">장르별</option>
          <option value="artist">아티스트별</option>
        </select>
        {view === "artist" && (
          <select
            value={artistSort}
            onChange={(e) => setArtistSort(e.target.value as "count" | "avg")}
            style={{ ...mobileSelectStyle, flex: "none" }}
          >
            <option value="avg">평균 평점순</option>
            <option value="count">음반 수순</option>
          </select>
        )}
      </div>

      {/* 데스크탑 필터 행: 지역(좌) + 탭/정렬(우) */}
      <div data-tour="best-main" className="hidden sm:flex" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["전체", "국내", "해외"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
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
            <Link
              key={v}
              href={`/best?view=${v}`}
              style={{
                padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                textDecoration: "none",
                backgroundColor: view === v ? "var(--accent)" : "var(--bg-elevated)",
                color: view === v ? "var(--bg)" : "var(--text-sub)",
                border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {v === "all" ? "통합" : v === "year" ? "연도별" : v === "genre" ? "장르별" : "아티스트별"}
            </Link>
          ))}
        </div>
      </div>

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
          onAlbumClick={(album) => { setArtistModal(null); setSelectedAlbum({ id: album.id, title: album.title, artist: album.artist, artist_display: album.artist_display ?? album.artist, year: album.year ?? null, release_date: null, genre: album.genre ?? null, cover_url: album.cover_url ?? null, spotify_id: album.spotify_id ?? null, avg: parseFloat(album.avg ?? "0"), count: album.ratings.length, variance: 0 }); }}
          source="best"
        />
      )}
    </>
  );
}
