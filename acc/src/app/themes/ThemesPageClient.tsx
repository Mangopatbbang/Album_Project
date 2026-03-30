"use client";

import { useState } from "react";
import Link from "next/link";
import AlbumModal from "@/components/album/AlbumModal";
import PlaylistEditor from "@/components/playlist/PlaylistEditor";
import type { AlbumStat } from "@/lib/stats";
import { AlbumWithRatings } from "@/types";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";
import { useAuth } from "@/context/AuthContext";
import { USERS } from "@/types";

// ── 타입 ──────────────────────────────────────────────
type PlaylistEntry = {
  id: string;
  sort_order: number;
  comment: string;
  albums: { id: string; title: string; artist: string; cover_url: string | null } | null;
};

type Playlist = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  playlist_entries: PlaylistEntry[];
};

// ── 상수 ──────────────────────────────────────────────
const THEMES = [
  { id: "eight_club", name: "8점 클럽", emoji: "⭐", description: "누군가 8점을 준 앨범들" },
  { id: "unanimous", name: "만장일치 명반", emoji: "🤝", description: "전원 평가 · 평균 7점 이상" },
  { id: "artist_best", name: "아티스트 대표작", emoji: "🎤", description: "2장 이상 청음한 아티스트의 최고작" },
  { id: "hidden_gems", name: "숨겨진 명반", emoji: "💎", description: "한 명만 들었는데 7점 이상" },
  { id: "controversial", name: "의견 충돌", emoji: "⚡", description: "멤버 간 점수 편차가 가장 큰 앨범들" },
] as const;

const THEME_LIMIT = 8;

// ── 유틸 ──────────────────────────────────────────────
function toAlbumWithRatings(a: AlbumStat): AlbumWithRatings {
  return {
    id: a.id, title: a.title, artist: a.artist,
    year: a.year ?? undefined, genre: a.genre ?? undefined,
    cover_url: a.cover_url ?? undefined, ratings: [],
  };
}

// ── 선곡집 카드 ────────────────────────────────────────
function PlaylistCard({ pl }: { pl: Playlist }) {
  const user = USERS.find((u) => u.id === pl.user_id);
  const covers = pl.playlist_entries.slice(0, 4).map((e) => e.albums?.cover_url ?? null);

  return (
    <Link
      href={`/playlist/${pl.id}`}
      style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "16px 18px", display: "flex",
        alignItems: "center", gap: 16, textDecoration: "none",
      }}
      className="transition-all hover:border-[var(--border-light)] hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {/* 커버 콜라주 */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 2, width: 64, height: 64, borderRadius: 8, overflow: "hidden", flexShrink: 0,
        backgroundColor: "var(--bg-elevated)",
      }}>
        {covers.length === 1 ? (
          covers[0]
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={covers[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", gridColumn: "span 2", gridRow: "span 2" }} />
            : <div style={{ gridColumn: "span 2", gridRow: "span 2", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20 }}>♪</span></div>
        ) : (
          [0, 1, 2, 3].map((i) => (
            <div key={i} style={{ overflow: "hidden", backgroundColor: "var(--bg-elevated)" }}>
              {covers[i]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={covers[i]!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", backgroundColor: "var(--bg-elevated)" }} />
              }
            </div>
          ))
        )}
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pl.title}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {user ? `${user.emoji} ${user.display_name}` : pl.user_id} · {pl.playlist_entries.length}장
        </p>
      </div>

      <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>→</span>
    </Link>
  );
}

// ── 테마 섹션 ──────────────────────────────────────────
function ThemeSection({
  theme, list, onAlbumClick,
}: {
  theme: typeof THEMES[number];
  list: AlbumStat[];
  onAlbumClick: (a: AlbumStat) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? list : list.slice(0, THEME_LIMIT);
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
                cursor: "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <span style={{ color: "var(--text-muted)", fontSize: 10, width: 14, textAlign: "right", flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div style={{
                width: 34, height: 34, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                backgroundColor: "var(--bg-elevated)", border: `1px solid ${glowBorder(album.avg)}`,
                boxShadow: glowShadow(album.avg),
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

      {list.length > THEME_LIMIT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 12, color: "var(--text-muted)", fontSize: 11,
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "underline", textUnderlineOffset: 2, padding: 0,
          }}
        >
          {expanded ? "접기" : `+${list.length - THEME_LIMIT}장 더보기`}
        </button>
      )}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────
export default function ThemesPageClient({
  themeData,
  initialPlaylists,
}: {
  themeData: Record<string, AlbumStat[]>;
  initialPlaylists: Playlist[];
}) {
  const { profile } = useAuth();
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumStat | null>(null);

  const handleSaved = async () => {
    const res = await fetch("/api/playlists");
    const data = await res.json();
    setPlaylists(data.items ?? []);
  };

  return (
    <>
      {/* ── 선곡집 ── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
            선곡집
          </p>
          {profile && (
            <button
              onClick={() => setShowEditor(true)}
              style={{
                backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                color: "var(--text-sub)", borderRadius: 6, padding: "5px 12px",
                fontSize: 12, cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-light)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-sub)"; }}
            >
              + 새 선곡집
            </button>
          )}
        </div>

        {playlists.length === 0 ? (
          <div style={{
            border: "1px dashed var(--border)", borderRadius: 10, padding: "32px 24px",
            textAlign: "center", color: "var(--text-muted)", fontSize: 13,
          }}>
            아직 선곡집이 없습니다
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {playlists.map((pl) => <PlaylistCard key={pl.id} pl={pl} />)}
          </div>
        )}
      </div>

      {/* ── 구분선 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", flexShrink: 0 }}>
          테마 컬렉션
        </p>
        <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
      </div>

      {/* ── 테마 ── */}
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

      {showEditor && (
        <PlaylistEditor
          onClose={() => setShowEditor(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
