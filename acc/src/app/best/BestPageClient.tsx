"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import type { AlbumStat } from "@/lib/stats";
import { AlbumWithRatings } from "@/types";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";

const TOP_N = 5;

function toAlbumWithRatings(a: AlbumStat): AlbumWithRatings {
  return {
    id: a.id,
    title: a.title,
    artist: a.artist,
    year: a.year ?? undefined,
    genre: a.genre ?? undefined,
    cover_url: a.cover_url ?? undefined,
    ratings: [],
  };
}

// 섹션 전체 목록 팝업
function SectionPopup({
  label,
  list,
  onClose,
  onAlbumClick,
}: {
  label: string;
  list: AlbumStat[];
  onClose: () => void;
  onAlbumClick: (a: AlbumStat) => void;
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
        {/* 헤더 */}
        <div style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
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

        {/* 목록 */}
        <div style={{ overflowY: "auto", padding: "8px 0" }}>
          {list.map((album, idx) => (
            <div
              key={album.id}
              onClick={() => { onClose(); onAlbumClick(album); }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 24px",
                cursor: "pointer",
                borderBottom: idx < list.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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
                  {album.artist}
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
}: {
  label: string;
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
  onMoreClick: () => void;
}) {
  const top = list.slice(0, TOP_N);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
          {label}
        </h2>
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
      <div style={{ display: "flex", gap: 8, overflow: "hidden" }}>
        {top.map((album, idx) => (
          <div
            key={album.id}
            style={{ width: 90, flexShrink: 0, cursor: "pointer" }}
            onClick={() => onAlbumClick(album)}
            className="transition-transform active:scale-[0.93]"
          >
            <div style={{
              width: 90, height: 90,
              borderRadius: 6,
              overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
              border: `1px solid ${glowBorder(album.avg)}`,
              boxShadow: glowShadow(album.avg),
              position: "relative",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0.8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
            >
              {album.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 20, color: "var(--text-muted)" }}>♪</span>
                  </div>
              }
              {/* 순위 뱃지 */}
              <div style={{
                position: "absolute", top: 5, left: 5,
                backgroundColor: idx === 0 ? "var(--accent)" : "rgba(0,0,0,0.6)",
                color: idx === 0 ? "var(--bg)" : "var(--text-muted)",
                fontSize: 10, fontWeight: 700,
                borderRadius: 4, padding: "2px 5px",
              }}>
                {idx + 1}
              </div>
              {/* 점수 뱃지 */}
              <div style={{
                position: "absolute", bottom: 5, right: 5,
                backgroundColor: "rgba(0,0,0,0.7)",
                color: scoreColor(album.avg),
                fontSize: 11, fontWeight: 700,
                borderRadius: 4, padding: "2px 5px",
              }}>
                {album.avg.toFixed(1)}
              </div>
            </div>
            <p style={{ color: "var(--text)", fontSize: 11, fontWeight: 500, marginTop: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.title}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.artist}
            </p>
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
}: {
  artist: string;
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
}) {
  const artistAvg = (list.reduce((s, a) => s + a.avg, 0) / list.length);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
          {artist}
        </h2>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{list.length}장</span>
        <span style={{ color: scoreColor(artistAvg), fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>
          avg {artistAvg.toFixed(2)}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {list.map((album, idx) => (
          <div
            key={album.id}
            style={{ width: 80, flexShrink: 0, cursor: "pointer" }}
            onClick={() => onAlbumClick(album)}
            className="transition-transform active:scale-[0.93]"
          >
            <div style={{
              width: 80, height: 80, borderRadius: 6, overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
              border: `1px solid ${glowBorder(album.avg)}`,
              boxShadow: glowShadow(album.avg),
              position: "relative", transition: "opacity 0.15s",
            }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0.8")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
            >
              {album.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18, color: "var(--text-muted)" }}>♪</span>
                  </div>
              }
              <div style={{
                position: "absolute", top: 4, left: 4,
                backgroundColor: idx === 0 ? "var(--accent)" : "rgba(0,0,0,0.6)",
                color: idx === 0 ? "var(--bg)" : "var(--text-muted)",
                fontSize: 9, fontWeight: 700, borderRadius: 3, padding: "1px 4px",
              }}>
                {idx + 1}
              </div>
              <div style={{
                position: "absolute", bottom: 4, right: 4,
                backgroundColor: "rgba(0,0,0,0.7)",
                color: scoreColor(album.avg),
                fontSize: 10, fontWeight: 700, borderRadius: 3, padding: "1px 4px",
              }}>
                {album.avg.toFixed(1)}
              </div>
            </div>
            <p style={{ color: "var(--text)", fontSize: 10, fontWeight: 500, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {album.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BestPageClient({
  sections,
  view,
}: {
  sections: [string, AlbumStat[]][];
  view: string;
}) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [artistSort, setArtistSort] = useState<"count" | "avg">("count");

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

  return (
    <>
      {view === "artist" ? (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
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
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {sortedArtistSections.map(([artist, list]) => (
              <ArtistSection
                key={artist}
                artist={artist}
                list={list}
                onAlbumClick={(a) => setSelectedAlbum(a)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8" style={{ minWidth: 0 }}>
          {sections.map(([label, list]) => (
            <SectionGrid
              key={label}
              label={label}
              list={list}
              onAlbumClick={(a) => setSelectedAlbum(a)}
              onMoreClick={() => setOpenSection(label)}
            />
          ))}
        </div>
      )}

      {selectedAlbum && (
        <AlbumModal
          album={toAlbumWithRatings(selectedAlbum)}
          onClose={() => setSelectedAlbum(null)}
        />
      )}

      {openSectionData && (
        <SectionPopup
          label={openSectionData[0]}
          list={openSectionData[1]}
          onClose={() => setOpenSection(null)}
          onAlbumClick={(a) => setSelectedAlbum(a)}
        />
      )}
    </>
  );
}
