import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";
import ProfileCaptureButton from "@/components/profile/ProfileCaptureButton";

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("playlists")
    .select(`
      id, title, user_id, created_at,
      playlist_entries(
        id, sort_order, comment, recommended_tracks,
        albums(id, title, artist, year, release_date, genre, cover_url, tracklist)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const entries = (data.playlist_entries ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );

  const user = USERS.find((u) => u.id === data.user_id);

  // 작성자의 평점 가져오기
  const albumIds = entries.map((e: { albums: { id: string } | { id: string }[] | null }) => Array.isArray(e.albums) ? e.albums[0]?.id : e.albums?.id).filter(Boolean);
  const { data: ratings } = albumIds.length > 0
    ? await supabaseServer
        .from("ratings")
        .select("album_id, score")
        .eq("user_id", data.user_id)
        .in("album_id", albumIds)
    : { data: [] };

  const ratingMap = new Map((ratings ?? []).map((r: { album_id: string; score: number }) => [r.album_id, r.score]));

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />

      <main id="playlist-card" style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 96px" }}>
        {/* 헤더 */}
        <div style={{ marginBottom: 40 }}>
          <Link
            href="/"
            style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
            className="hover:text-[var(--accent)] transition-colors"
          >
            ← 홈으로
          </Link>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>
            PLAYLIST
          </p>
          <h1 style={{ color: "var(--text)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.03em", marginBottom: 12 }}>
            {data.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user && (
              <Link href={`/profile/${user.id}`} style={{ color: "var(--text-sub)", fontSize: 13, textDecoration: "none" }}
                className="hover:text-[var(--accent)] transition-colors">
                {user.emoji} {user.display_name}
              </Link>
            )}
            <span style={{ color: "var(--border-light)" }}>·</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {new Date(data.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span style={{ color: "var(--border-light)" }}>·</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{entries.length}장</span>
            <ProfileCaptureButton targetId="playlist-card" />
          </div>
        </div>

        {/* 엔트리 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {(entries as any[]).map((entry: {
            id: string; sort_order: number; comment: string; recommended_tracks: string | null;
            albums: { id: string; title: string; artist: string; year?: string; release_date?: string; genre?: string; cover_url?: string; tracklist?: string | null } | null;
          }, idx: number) => {
            if (Array.isArray(entry.albums)) entry = { ...entry, albums: entry.albums[0] ?? null };
            const album = entry.albums;
            if (!album) return null;

            const tracklistArr = album.tracklist
              ? album.tracklist.split(";").map((t: string) => t.trim()).filter(Boolean)
              : [];
            const recTracks = entry.recommended_tracks
              ? entry.recommended_tracks.split(",").map(Number)
                  .filter((i: number) => i >= 0 && i < tracklistArr.length)
                  .map((i: number) => ({ idx: i, name: tracklistArr[i] }))
              : [];

            return (
              <div key={entry.id} style={{
                display: "flex", flexDirection: "column", gap: 16,
                paddingBottom: 32,
                borderBottom: idx < entries.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                {/* 앨범 헤더 */}
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                    backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                  }}>
                    {album.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 28, color: "var(--text-muted)" }}>♪</span></div>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>{String(idx + 1).padStart(2, "0")}</span>
                    <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", marginTop: 2 }}>
                      {album.title}
                    </p>
                    <p style={{ color: "var(--text-sub)", fontSize: 13, marginTop: 2 }}>
                      {album.artist}
                      {(album.release_date || album.year) && (
                        <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                          {album.release_date ? album.release_date.slice(0, 4) : album.year}
                        </span>
                      )}
                      {album.genre && (
                        <span style={{
                          marginLeft: 8, fontSize: 11, backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px",
                          color: "var(--text-muted)",
                        }}>
                          {album.genre}
                        </span>
                      )}
                    </p>
                  </div>
                  {/* 평점 뱃지 */}
                  {ratingMap.has(album.id) && (
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                      backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ color: scoreColor(ratingMap.get(album.id)), fontWeight: 700, fontSize: 18 }}>
                        {ratingMap.get(album.id)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 추천 트랙 */}
                {recTracks.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginRight: 4 }}>
                      ♪
                    </span>
                    {recTracks.map(({ idx, name }) => (
                      <span key={idx} style={{
                        fontSize: 12, padding: "3px 10px", borderRadius: 12,
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                        backgroundColor: "rgba(232,255,72,0.06)",
                      }}>
                        {idx + 1}. {name}
                      </span>
                    ))}
                  </div>
                )}

                {/* 감상 */}
                {entry.comment && (
                  <p style={{
                    color: "var(--text-sub)", fontSize: 14, lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                  }}>
                    {entry.comment}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
