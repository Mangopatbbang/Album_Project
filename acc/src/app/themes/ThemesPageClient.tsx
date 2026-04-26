"use client";

import { useState } from "react";
import Link from "next/link";
import PlaylistEditor from "@/components/playlist/PlaylistEditor";
import { useAuth } from "@/context/AuthContext";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import { USERS } from "@/types";
import UserAvatar from "@/components/ui/UserAvatar";

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

function PlaylistCard({ pl }: { pl: Playlist }) {
  const avatarMap = useUserAvatars();
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
          {user && <><UserAvatar avatarUrl={avatarMap[user.id]} size={12} />{" "}</>}{user ? user.display_name : pl.user_id} · {pl.playlist_entries.length}장
        </p>
      </div>

      <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>→</span>
    </Link>
  );
}

export default function ThemesPageClient({
  initialPlaylists,
}: {
  initialPlaylists: Playlist[];
}) {
  const { profile } = useAuth();
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [showEditor, setShowEditor] = useState(false);

  const handleSaved = async () => {
    const res = await fetch("/api/playlists");
    const data = await res.json();
    setPlaylists(data.items ?? []);
  };

  return (
    <>
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

      {showEditor && (
        <PlaylistEditor
          onClose={() => setShowEditor(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
