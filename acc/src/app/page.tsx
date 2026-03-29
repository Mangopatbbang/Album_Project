import Link from "next/link";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { USERS, AlbumWithRatings } from "@/types";
import PlaylistSection from "@/components/playlist/PlaylistSection";
import RecentAlbumsSection from "@/components/album/RecentAlbumsSection";
import { fetchAllAlbumsWithRatings, getBestByYear, getEightClub, getUnanimous, getControversial, getHiddenGems, getArtistBest, THEMES } from "@/lib/stats";
import { scoreColor } from "@/lib/score";
import RandomButton from "@/components/album/RandomButton";
import CountUp from "@/components/ui/CountUp";

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
      .select("user_id, score")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allData.push(...data);
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

async function getPlaylists() {
  const { data } = await supabaseServer
    .from("playlists")
    .select(`
      id, title, user_id, created_at,
      playlist_entries(id, sort_order, comment, albums(id, title, artist, cover_url))
    `)
    .order("created_at", { ascending: false })
    .limit(10);

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
  maxWidth: "960px",
  margin: "0 auto",
  padding: "0 24px",
};

async function getStatsPreview() {
  const albums = await fetchAllAlbumsWithRatings();
  const byYear = getBestByYear(albums);
  // 최근 5년 각 1위
  const yearPreview = [...byYear.entries()].slice(0, 5).map(([year, list]) => ({ year, album: list[0] }));
  // 테마 카운트 + 커버 4장
  const themeData: Record<string, { count: number; covers: (string | null)[] }> = {
    eight_club: (() => { const l = getEightClub(albums); return { count: l.length, covers: l.slice(0, 4).map(a => a.cover_url) }; })(),
    unanimous: (() => { const l = getUnanimous(albums); return { count: l.length, covers: l.slice(0, 4).map(a => a.cover_url) }; })(),
    artist_best: (() => { const l = getArtistBest(albums); return { count: l.length, covers: l.slice(0, 4).map(a => a.cover_url) }; })(),
    hidden_gems: (() => { const l = getHiddenGems(albums); return { count: l.length, covers: l.slice(0, 4).map(a => a.cover_url) }; })(),
    controversial: (() => { const l = getControversial(albums).slice(0, 30); return { count: l.length, covers: l.slice(0, 4).map(a => a.cover_url) }; })(),
  };
  return { yearPreview, themeData };
}

export default async function HomePage() {
  const [recentAlbums, memberStats, totalCount, playlists, statsPreview] = await Promise.all([
    getRecentAlbums(),
    getMemberStats(),
    getTotalCount(),
    getPlaylists(),
    getStatsPreview(),
  ]);
  const { yearPreview, themeData } = statsPreview;

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />

      {/* 히어로 */}
      <section style={{ ...containerStyle, paddingTop: 72, paddingBottom: 64, textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 24, right: 24 }}>
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
          className="text-6xl mb-6"
        >
          아차청음사
        </h1>
        <p style={{ color: "var(--text-sub)", fontSize: 48, marginBottom: 32, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}>
          <CountUp target={totalCount} />
        </p>
      </section>

      {/* 최근 아카이빙 */}
      <section style={{ ...containerStyle, paddingBottom: 64 }}>
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

      {/* 플레이리스트 */}
      <section style={{ ...containerStyle, paddingBottom: 64 }}>
        <PlaylistSection initialPlaylists={playlists as any} />
      </section>

      {/* 베스트 & 테마 */}
      <section style={{ ...containerStyle, paddingBottom: 64 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 연도별 베스트 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
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
                  <div style={{ width: 36, height: 36, borderRadius: 5, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    {album.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14, color: "var(--text-muted)" }}>♪</span></div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{album.artist}</p>
                  </div>
                  <span style={{ color: scoreColor(album.avg), fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{album.avg.toFixed(1)}</span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* 테마별 플레이리스트 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: "var(--text)", fontWeight: 600, letterSpacing: "-0.02em" }} className="text-base">
                테마별 선곡집
              </h2>
              <Link href="/themes" style={{ color: "var(--text-muted)" }} className="text-xs hover:text-[var(--accent)] transition-colors">
                더보기 →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {THEMES.map((theme) => {
                const td = themeData[theme.id];
                return (
                  <Link key={theme.id} href="/themes" style={{ textDecoration: "none" }} className="hover:opacity-80 transition-opacity">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{theme.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>{theme.name}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{theme.description}</p>
                      </div>
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {(td?.covers ?? []).filter(Boolean).slice(0, 4).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url!} alt="" style={{ width: 24, height: 24, borderRadius: 3, objectFit: "cover" }} />
                        ))}
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0, marginLeft: 4 }}>{td?.count ?? 0}장</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 멤버 현황 */}
      <section style={{ ...containerStyle, paddingBottom: 96 }}>
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
              className="rounded-lg p-4 hover:border-[var(--border-light)] transition-colors"
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
    </div>
  );
}
