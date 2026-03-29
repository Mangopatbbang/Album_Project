"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import type { AlbumStat } from "@/lib/stats";
import { AlbumWithRatings } from "@/types";
import { scoreColor } from "@/lib/score";

const THEMES = [
  { id: "eight_club", name: "8점 클럽", emoji: "⭐", description: "누군가 8점을 준 앨범들" },
  { id: "unanimous", name: "만장일치 명반", emoji: "🤝", description: "전원 평가 · 평균 7점 이상" },
  { id: "artist_best", name: "아티스트 대표작", emoji: "🎤", description: "2장 이상 청음한 아티스트의 최고작" },
  { id: "hidden_gems", name: "숨겨진 명반", emoji: "💎", description: "한 명만 들었는데 7점 이상" },
  { id: "controversial", name: "의견 충돌", emoji: "⚡", description: "멤버 간 점수 편차가 가장 큰 앨범들" },
] as const;

const THEME_LIMIT = 8;

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

function ThemeSection({
  theme,
  list,
  onAlbumClick,
}: {
  theme: typeof THEMES[number];
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
}) {
  const shown = list.slice(0, THEME_LIMIT);
  return (
    <div style={{
      backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "24px 28px",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{theme.emoji}</span>
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
          {theme.name}
        </p>
        <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 2 }}>{list.length}장</span>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>{theme.description}</p>

      {shown.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>인연 닿는 음반이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {shown.map((album, idx) => (
            <div
              key={album.id}
              onClick={() => onAlbumClick(album)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 0",
                borderBottom: idx < shown.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span style={{ color: "var(--text-muted)", fontSize: 10, width: 14, textAlign: "right", flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{
                width: 34, height: 34, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
              }}>
                {album.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>♪</span>
                    </div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {album.title}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  {album.artist}{album.year ? ` · ${album.year}` : ""}
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
      )}
    </div>
  );
}

export default function ThemesPageClient({
  themeData,
}: {
  themeData: Record<string, AlbumStat[]>;
}) {
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {THEMES.map((theme) => (
          <ThemeSection
            key={theme.id}
            theme={theme}
            list={themeData[theme.id] ?? []}
            onAlbumClick={setSelectedAlbum}
          />
        ))}
      </div>

      {selectedAlbum && (
        <AlbumModal
          album={toAlbumWithRatings(selectedAlbum)}
          onClose={() => setSelectedAlbum(null)}
        />
      )}
    </>
  );
}
