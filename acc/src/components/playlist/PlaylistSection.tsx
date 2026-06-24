"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUserAvatars } from "@/context/UserAvatarsContext";
import PlaylistEditor from "./PlaylistEditor";
import { useUsers } from "@/context/UsersContext";
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

type Props = {
  initialPlaylists: Playlist[];
};

export default function PlaylistSection({ initialPlaylists }: Props) {
  const { profile } = useAuth();
  const avatarMap = useUserAvatars();
  const { getUserById } = useUsers();
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [showEditor, setShowEditor] = useState(false);

  const handleSaved = async () => {
    const res = await fetch("/api/playlists");
    const data = await res.json();
    setPlaylists(data.items ?? []);
  };

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ color: "var(--text)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em" }}>
            청음집
          </h2>
          <Link
            href="/themes"
            style={{ color: "var(--text-muted)", fontSize: 11 }}
            className="hover:text-[var(--accent)] transition-colors"
          >
            전체 보기 →
          </Link>
        </div>
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
            + 새 청음집
          </button>
        )}
      </div>

      {playlists.length === 0 ? (
        <div style={{
          border: "1px dashed var(--border)", borderRadius: 10, padding: "40px 24px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 24, marginBottom: 10 }}>♫</p>
          <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>아직 청음집이 없어요</p>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>마음에 드는 앨범들을 모아<br />나만의 청음집을 만들어보세요</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {playlists.map((pl) => {
            const user = getUserById(pl.user_id);
            const covers = pl.playlist_entries.slice(0, 4).map((e) => e.albums?.cover_url ?? null);

            return (
              <Link
                key={pl.id}
                href={`/playlist/${pl.id}`}
                style={{
                  backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "16px 18px", display: "flex",
                  alignItems: "center", gap: 16, textDecoration: "none",
                }}
                className="hover:border-[var(--border-light)] transition-colors"
              >
                {/* 커버 콜라주 */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: 2, width: 72, height: 72, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                  backgroundColor: "var(--bg-elevated)",
                }}>
                  {covers.length === 1 ? (
                    covers[0]
                      ? <img loading="lazy" src={covers[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", gridColumn: "span 2", gridRow: "span 2" }} /> // eslint-disable-line @next/next/no-img-element
                      : <div style={{ gridColumn: "span 2", gridRow: "span 2", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 24 }}>♪</span></div>
                  ) : (
                    [0, 1, 2, 3].map((i) => (
                      <div key={i} style={{ overflow: "hidden", backgroundColor: "var(--bg-elevated)" }}>
                        {covers[i]
                          ? <img loading="lazy" src={covers[i]!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> // eslint-disable-line @next/next/no-img-element
                          : <div style={{ width: "100%", height: "100%", backgroundColor: "var(--bg-elevated)" }} />
                        }
                      </div>
                    ))
                  )}
                </div>

                {/* 텍스트 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {pl.title}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {user && <><UserAvatar avatarUrl={avatarMap[user.id]} size={12} />{" "}</>}{user ? user.display_name : pl.user_id} · 음반 {pl.playlist_entries.length}장
                  </p>
                </div>

                <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>→</span>
              </Link>
            );
          })}
        </div>
      )}

      {showEditor && (
        <PlaylistEditor
          onClose={() => setShowEditor(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
