import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import { fetchAllUsers, fetchAllUserAvatarUrls } from "@/lib/stats";
import { scoreColor } from "@/lib/score";
import UserAvatar from "@/components/ui/UserAvatar";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

type RawAlbum = {
  id: string;
  title: string;
  artist: string;
  use_artist_variant: boolean | null;
  year: string | null;
  genre: string | null;
  cover_url: string | null;
  spotify_id: string | null;
  soundcloud_url: string | null;
  tracklist: string | null;
  ratings: { user_id: string; score: number; one_line_review: string | null; liked_tracks: string | null }[];
  artist_display?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseServer
    .from("albums")
    .select("title, artist, cover_url")
    .eq("id", id)
    .single();
  if (!data) return { title: "앨범" };
  return {
    title: `${data.title} — ${data.artist}`,
    openGraph: {
      images: data.cover_url ? [data.cover_url] : [],
    },
  };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data, error }, users, avatarMap] = await Promise.all([
    supabaseServer
      .from("albums")
      .select(
        "id, title, artist, use_artist_variant, year, genre, cover_url, spotify_id, soundcloud_url, tracklist, ratings(user_id, score, one_line_review, liked_tracks)"
      )
      .eq("id", id)
      .single(),
    fetchAllUsers(),
    fetchAllUserAvatarUrls(),
  ]);

  if (error || !data) notFound();

  const [resolved] = await resolveArtistDisplay([data]);
  const album = resolved as unknown as RawAlbum;

  const ratings = album.ratings as RawAlbum["ratings"];
  const scores = ratings.map((r) => r.score);
  const avg =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  const userMap = new Map(users.map((u) => [u.id, u]));
  const tracklist = album.tracklist
    ? album.tracklist.split(";").map((t) => t.trim()).filter(Boolean)
    : [];

  const sortedRatings = [...ratings].sort((a, b) => b.score - a.score);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        <Link
          href="/albums"
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 28,
          }}
          className="hover:text-[var(--text)] transition-colors"
        >
          ← 음반고
        </Link>

        {/* 앨범 헤로 */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 32,
            alignItems: "flex-start",
          }}
          className="sm:gap-6"
        >
          {/* 커버 */}
          <div
            style={{
              flexShrink: 0,
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: "var(--bg-elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="w-36 h-36 sm:w-48 sm:h-48"
          >
            {album.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.cover_url}
                alt={album.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: 32 }}>♪</span>
            )}
          </div>

          {/* 정보 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {album.year || album.genre ? (
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 6 }}>
                {[album.year, album.genre].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <h1
              style={{
                color: "var(--text)",
                fontWeight: 700,
                fontSize: 20,
                lineHeight: 1.25,
                marginBottom: 6,
                wordBreak: "keep-all",
              }}
              className="sm:text-2xl"
            >
              {album.title}
            </h1>
            <p style={{ color: "var(--text-sub)", fontSize: 14, marginBottom: 16 }}>
              {album.artist_display ?? album.artist}
            </p>

            {avg ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    color: scoreColor(avg),
                    fontWeight: 800,
                    fontSize: 36,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {avg}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  / {scores.length}명
                </span>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                아직 평가가 없어요
              </p>
            )}

            {album.soundcloud_url ? (
              <a
                href={album.soundcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "rgba(255,85,0,0.7)",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  textDecoration: "none",
                }}
              >
                SoundCloud →
              </a>
            ) : (
              <SpotifyAttribution spotifyId={album.spotify_id} />
            )}
          </div>
        </div>

        {/* 청음 기록 */}
        {sortedRatings.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2
              style={{
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 14,
                letterSpacing: "-0.01em",
              }}
            >
              청음 기록
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sortedRatings.map((r) => {
                const user = userMap.get(r.user_id);
                const trackCount = r.liked_tracks
                  ? r.liked_tracks.split(",").filter(Boolean).length
                  : 0;
                return (
                  <div
                    key={r.user_id}
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <UserAvatar avatarUrl={avatarMap[r.user_id] ?? null} size={22} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: r.one_line_review ? 4 : 0,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text)",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {user?.display_name ?? "익명"}
                        </span>
                        <span
                          style={{
                            color: scoreColor(r.score),
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {r.score}
                        </span>
                      </div>
                      {r.one_line_review && (
                        <p
                          style={{
                            color: "var(--text-sub)",
                            fontSize: 12,
                            fontStyle: "italic",
                            lineHeight: 1.5,
                          }}
                        >
                          &ldquo;{r.one_line_review}&rdquo;
                        </p>
                      )}
                      {trackCount > 0 && (
                        <p
                          style={{
                            color: "var(--error, #e05050)",
                            fontSize: 11,
                            marginTop: 4,
                            opacity: 0.75,
                          }}
                        >
                          ♥ {trackCount}곡 찜
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 트랙리스트 */}
        {tracklist.length > 0 && (
          <section>
            <h2
              style={{
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 12,
                letterSpacing: "-0.01em",
              }}
            >
              트랙리스트
            </h2>
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {tracklist.map((track, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 14px",
                    borderBottom:
                      i < tracklist.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 11,
                      minWidth: 20,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: "var(--text)", fontSize: 13 }}>
                    {track}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
