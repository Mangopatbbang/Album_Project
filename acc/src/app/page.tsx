import Link from "next/link";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { USERS, AlbumWithRatings } from "@/types";
import RecentAlbumsSection from "@/components/album/RecentAlbumsSection";
import { fetchAllAlbumsWithRatings, getBestByYear } from "@/lib/stats";
import { scoreColor, glowShadow, glowBorder } from "@/lib/score";
import RandomButton from "@/components/album/RandomButton";
import CountUp from "@/components/ui/CountUp";
import AlbumCoverButton from "@/components/album/AlbumCoverButton";
import SpotifyAttribution from "@/components/ui/SpotifyAttribution";

async function getRecentAlbums() {
  const { data } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, ratings(id, user_id, score, one_line_review, created_at, updated_at)")
    .order("created_at", { ascending: false })
    .limit(4);
  return data ?? [];
}

async function getMemberStats() {
  const allData: { user_id: string; score: number }[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabaseServer
      .from("ratings")
      .select("user_id, score, albums!inner(id)")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allData.push(...(data as unknown as { user_id: string; score: number }[]));
    if (data.length < 1000) break;
  }

  return USERS.map((user) => {
    const userRatings = allData.filter((r) => r.user_id === user.id);
    const avg =
      userRatings.length > 0
        ? (userRatings.reduce((a, b) => a + b.score, 0) / userRatings.length).toFixed(1)
        : null;
    return { ...user, count: userRatings.length, avg };
  });
}


async function getRecentPlaylists() {
  const { data } = await supabaseServer
    .from("playlists")
    .select(`id, title, user_id, playlist_entries(id, sort_order, albums(id, cover_url))`)
    .order("created_at", { ascending: false })
    .limit(4);
  return (data ?? []).map((p) => ({
    ...p,
    playlist_entries: (p.playlist_entries ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  }));
}

async function getTotalCount() {
  const { count } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

// 모든 섹션에 쓸 공통 컨테이너 클래스
const containerStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 16px",
};

async function getYearPreview() {
  const albums = await fetchAllAlbumsWithRatings();
  const byYear = getBestByYear(albums);
  return [...byYear.entries()].slice(0, 5).map(([year, list]) => ({ year, album: list[0] }));
}

export default async function HomePage() {
  const [recentAlbums, memberStats, totalCount, yearPreview, recentPlaylists] = await Promise.all([
    getRecentAlbums(),
    getMemberStats(),
    getTotalCount(),
    getYearPreview(),
    getRecentPlaylists(),
  ]);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />

      <main>
      {/* 히어로 */}
      <section style={{ ...containerStyle, textAlign: "center", position: "relative" }} className="pt-8 sm:pt-[72px] pb-8 sm:pb-16">
        <div style={{ position: "absolute", top: 12, right: 16 }} className="sm:top-6 sm:right-6">
          <RandomButton />
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
          청음의 기록
        </p>
        <h1
          style={{
            color: "var(--text)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.04em",
          }}
          className="text-4xl sm:text-6xl mb-6"
        >
          아차청음사
        </h1>
        <p style={{ color: "var(--text-sub)", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 32 }} className="text-4xl sm:text-[48px]">
          <CountUp target={totalCount} />
        </p>
      </section>

      {/* 최근 아카이빙 */}
      <section style={{ ...containerStyle }} className="pb-8 sm:pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2
            style={{ color: "var(--text)", fontWeight: 600, letterSpacing: "-0.02em" }}
            className="text-lg"
          >
            최근 청음
          </h2>
          <Link
            href="/albums"
            style={{ color: "var(--text-muted)" }}
            className="text-xs hover:text-[var(--accent)] transition-colors"
          >
            전체보기 →
          </Link>
        </div>
        <RecentAlbumsSection albums={recentAlbums as AlbumWithRatings[]} />
      </section>

      {/* 베스트 & 테마 */}
      <section style={{ ...containerStyle }} className="pb-8 sm:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 연도별 베스트 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: "var(--text)", fontWeight: 600, letterSpacing: "-0.02em" }} className="text-base">
                연도별 명반
              </h2>
              <Link href="/best" style={{ color: "var(--text-muted)" }} className="text-xs hover:text-[var(--accent)] transition-colors">
                더보기 →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {yearPreview.map(({ year, album }) => album ? (
                <div key={year} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, width: 36, flexShrink: 0 }}>{year}</span>
                  <AlbumCoverButton album={{ ...album, cover_url: album.cover_url ?? null }} style={{ flexShrink: 0 }} hoverOpacity>
                    <div style={{ width: 36, height: 36, borderRadius: 5, overflow: "hidden", backgroundColor: "var(--bg-elevated)", border: `1px solid ${glowBorder(album.avg)}`, boxShadow: glowShadow(album.avg) }}>
                      {album.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14, color: "var(--text-muted)" }}>♪</span></div>
                      }
                    </div>
                  </AlbumCoverButton>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{album.artist}</p>
                      <SpotifyAttribution spotifyId={album.spotify_id} />
                    </div>
                  </div>
                  <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{album.avg.toFixed(1)}</span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* 선곡집 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4 sm:p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: "var(--text)", fontWeight: 600, letterSpacing: "-0.02em" }} className="text-base">
                선곡집
              </h2>
              <Link href="/themes" style={{ color: "var(--text-muted)" }} className="text-xs hover:text-[var(--accent)] transition-colors">
                더보기 →
              </Link>
            </div>
            {recentPlaylists.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>아직 선곡집이 없습니다</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recentPlaylists.map((pl) => {
                  const user = USERS.find((u) => u.id === pl.user_id);
                  const covers = pl.playlist_entries.slice(0, 4).map((e: { albums: { cover_url: string | null } | { cover_url: string | null }[] | null }) => {
                    const a = Array.isArray(e.albums) ? e.albums[0] : e.albums;
                    return a?.cover_url ?? null;
                  });
                  return (
                    <Link key={pl.id} href={`/playlist/${pl.id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }} className="hover:opacity-80 transition-opacity">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, width: 40, height: 40, borderRadius: 6, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)" }}>
                        {[0,1,2,3].map((i) => (
                          <div key={i} style={{ overflow: "hidden", backgroundColor: "var(--bg-elevated)" }}>
                            {covers[i]
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={covers[i]!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <div style={{ width: "100%", height: "100%", backgroundColor: "var(--bg-elevated)" }} />
                            }
                          </div>
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.title}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{user ? `${user.emoji} ${user.display_name}` : pl.user_id} · {pl.playlist_entries.length}장</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 멤버 현황 */}
      <section style={{ ...containerStyle }} className="pb-10 sm:pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ color: "var(--text)", fontWeight: 600, letterSpacing: "-0.02em" }} className="text-lg">
            청음인 현황
          </h2>
          <Link href="/members" style={{ color: "var(--text-muted)" }} className="text-xs hover:text-[var(--accent)] transition-colors">
            전체보기 →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {memberStats.map((member) => (
            <Link
              key={member.id}
              href={`/profile/${member.id}`}
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
              className="rounded-lg p-4 transition-all hover:border-[var(--border-light)] hover:-translate-y-0.5 active:scale-[0.97]"
            >
              <p className="text-2xl mb-2">{member.emoji}</p>
              <p style={{ color: "var(--text)", fontWeight: 500 }} className="text-sm">
                {member.display_name}
              </p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p style={{ color: "var(--text-muted)" }} className="text-xs">청음</p>
                  <p style={{ color: "var(--text-sub)" }} className="text-sm font-medium">
                    {member.count}장
                  </p>
                </div>
                {member.avg && (
                  <div className="text-right">
                    <p style={{ color: "var(--text-muted)" }} className="text-xs">평균</p>
                    <p style={{ color: "var(--accent)" }} className="text-sm font-medium">
                      {member.avg}점
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
      </main>
    </div>
  );
}
