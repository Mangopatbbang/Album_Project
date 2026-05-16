import Link from "next/link";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { AlbumWithRatings } from "@/types";
import { fetchAllUserAvatarUrls } from "@/lib/stats";
import HeroLogoutButton from "@/components/ui/HeroLogoutButton";
import CountUp from "@/components/ui/CountUp";
import MobileLoginHint from "@/components/ui/MobileLoginHint";
import HomeSearchBar from "@/components/ui/HomeSearchBar";
import ReviewTicker, { TickerItem } from "@/components/ui/ReviewTicker";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import HomeTodaySection from "@/components/home/HomeTodaySection";
import HomeRecentFeed, { FeedItem } from "@/components/home/HomeRecentFeed";

async function getTotalCount() {
  const { count } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

async function getRatingsCount() {
  const { count } = await supabaseServer
    .from("ratings")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

async function getMembersCount() {
  const { count } = await supabaseServer
    .from("users")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

async function getTodayAlbum(): Promise<AlbumWithRatings | null> {
  const { count } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true });
  if (!count || count === 0) return null;

  const dateStr = new Date().toISOString().slice(0, 10);
  const seed = dateStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const offset = seed % count;

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, use_artist_variant, year, release_date, genre, tracklist, cover_url, spotify_id, ratings(id, user_id, score, one_line_review, created_at, updated_at)")
    .order("id")
    .range(offset, offset)
    .single();

  if (error || !data) return null;
  const resolved = await resolveArtistDisplay([data]);
  return resolved[0] as unknown as AlbumWithRatings;
}

function serverShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getTickerReviews(): Promise<TickerItem[]> {
  const { data } = await supabaseServer
    .from("ratings")
    .select("user_id, score, one_line_review, albums(id, title, artist, use_artist_variant, cover_url)")
    .not("one_line_review", "is", null)
    .neq("one_line_review", "")
    .limit(80);
  if (!data) return [];
  const rows = (data as unknown as {
    user_id: string;
    score: number;
    one_line_review: string;
    albums: { id: string; title: string; artist: string; use_artist_variant: boolean | null; cover_url: string | null } | null;
  }[]).filter((r) => r.albums);

  const shuffled = serverShuffle(rows).slice(0, 40);
  const albumObjs = shuffled.map((r) => r.albums!);
  const resolved = await resolveArtistDisplay(albumObjs);
  const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display]));

  return shuffled.map((r) => ({
    user_id: r.user_id,
    score: r.score,
    one_line_review: r.one_line_review,
    album_id: r.albums!.id,
    album_title: r.albums!.title,
    album_artist: r.albums!.artist,
    album_artist_display: displayMap.get(r.albums!.id) ?? r.albums!.artist,
    album_cover_url: r.albums!.cover_url,
  }));
}

type RecentFeedRow = {
  user_id: string;
  score: number;
  one_line_review: string | null;
  updated_at: string;
  albums: {
    id: string;
    title: string;
    artist: string;
    use_artist_variant: boolean | null;
    cover_url: string | null;
    artist_display?: string;
  } | null;
};

async function getRecentFeed(): Promise<FeedItem[]> {
  const { data } = await supabaseServer
    .from("ratings")
    .select("user_id, score, one_line_review, updated_at, albums(id, title, artist, use_artist_variant, cover_url)")
    .not("score", "is", null)
    .order("updated_at", { ascending: false })
    .limit(6);
  if (!data) return [];

  const rows = (data as unknown as RecentFeedRow[]).filter((r) => r.albums);
  const albumObjs = rows.map((r) => r.albums!);
  if (albumObjs.length > 0) {
    const resolved = await resolveArtistDisplay(albumObjs);
    const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display]));
    for (const row of rows) {
      if (row.albums) row.albums.artist_display = displayMap.get(row.albums.id);
    }
  }

  return rows.map((r) => ({
    user_id: r.user_id,
    score: r.score,
    one_line_review: r.one_line_review,
    updated_at: r.updated_at,
    album_id: r.albums!.id,
    album_title: r.albums!.title,
    album_artist: r.albums!.artist,
    album_artist_display: r.albums!.artist_display ?? r.albums!.artist,
    album_cover_url: r.albums!.cover_url,
  }));
}

const containerStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
};

export default async function HomePage() {
  const [
    totalCount,
    ratingsCount,
    todayAlbum,
    recentFeedRaw,
    tickerItemsRaw,
    avatarMap,
  ] = await Promise.all([
    getTotalCount(),
    getRatingsCount(),
    getTodayAlbum(),
    getRecentFeed(),
    getTickerReviews(),
    fetchAllUserAvatarUrls(),
  ]);

  const tickerItems: TickerItem[] = tickerItemsRaw.map((item) => ({
    ...item,
    avatar_url: avatarMap[item.user_id] ?? null,
  }));

  const feedItems: FeedItem[] = recentFeedRaw.map((item) => ({
    ...item,
    avatar_url: avatarMap[item.user_id] ?? null,
  }));

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />

      <main>
        {/* 히어로 */}
        <section
          style={{
            ...containerStyle,
            textAlign: "center",
            position: "relative",
            padding: "24px 24px 16px",
          }}
        >
          {/* 모바일 로그아웃 버튼 */}
          <div style={{ position: "absolute", top: 18, right: 20 }}>
            <HeroLogoutButton />
          </div>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            청음의 기록
          </p>
          <h1
            style={{
              color: "var(--text)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              marginBottom: 22,
            }}
            className="text-3xl sm:text-5xl"
          >
            아차청음사
          </h1>

          {/* 통계 — 카드 없이 클린 타이포그래피 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 28,
              marginBottom: 4,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 24, lineHeight: 1, letterSpacing: "-0.04em" }}>
                <CountUp target={totalCount} />
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                앨범
              </p>
            </div>
            <div style={{ width: 1, height: 32, backgroundColor: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--text)", fontWeight: 800, fontSize: 24, lineHeight: 1, letterSpacing: "-0.04em" }}>
                <CountUp target={ratingsCount} />
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                평가
              </p>
            </div>
          </div>

          <HomeSearchBar />
          <MobileLoginHint />
        </section>

        {/* 리뷰 티커 */}
        <div style={{ ...containerStyle, padding: "0 24px" }}>
          <ReviewTicker items={tickerItems} inline />
        </div>

        {/* 메인 섹션 */}
        <div style={{ ...containerStyle, padding: "28px 24px 12px" }}>
          <div className="sm:grid sm:grid-cols-2 sm:gap-6">
            {/* 오늘의 인연 */}
            <div className="mb-8 sm:mb-0">
              <HomeTodaySection initialAlbum={todayAlbum} />
            </div>

            {/* 최근 평가 피드 */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2
                  style={{
                    color: "var(--text)",
                    fontWeight: 600,
                    fontSize: 14,
                    letterSpacing: "-0.02em",
                  }}
                >
                  최근 평가
                </h2>
                <Link
                  href="/reviews"
                  style={{ color: "var(--text-muted)", fontSize: 11 }}
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  더 보기 →
                </Link>
              </div>
              <div style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "4px 14px",
                flex: 1,
              }}>
                <HomeRecentFeed items={feedItems} />
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
