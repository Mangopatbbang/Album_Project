import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { AlbumWithRatings } from "@/types";
import { fetchAllUserAvatarUrls } from "@/lib/stats";
import CountUp from "@/components/ui/CountUp";
import ReviewTicker, { TickerItem } from "@/components/ui/ReviewTicker";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import HomeTodaySection from "@/components/home/HomeTodaySection";
import { ControversialItem } from "@/components/home/HomeControversialSection";
import HomeFlipCard from "@/components/home/HomeFlipCard";
import HomeHeroBackground from "@/components/home/HomeHeroBackground";
import WelcomeOnboarding from "@/components/ui/WelcomeOnboarding";
import HomeWeeklySection, { WeeklyAlbum } from "@/components/home/HomeWeeklySection";
import HomeSyncedGrid from "@/components/home/HomeSyncedGrid";

const getTotalCount = unstable_cache(
  async () => {
    const { count } = await supabaseServer.from("albums").select("id", { count: "exact", head: true });
    return count ?? 0;
  },
  ["home-total-count"],
  { tags: ["albums-page-meta"], revalidate: false }
);

const getRatingsCount = unstable_cache(
  async () => {
    const { count } = await supabaseServer.from("ratings").select("id", { count: "exact", head: true });
    return count ?? 0;
  },
  ["home-ratings-count"],
  { tags: ["profile-ratings"], revalidate: false }
);

// 낮(6~18시) / 밤(18~6시) 기준 앨범 교체
const _getTodayAlbumCached = unstable_cache(
  async (dateStr: string): Promise<AlbumWithRatings | null> => {
    const { count } = await supabaseServer
      .from("albums")
      .select("id", { count: "exact", head: true });
    if (!count || count === 0) return null;
    let h = 2166136261;
    for (const c of dateStr) { h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; }
    const offset = h % count;
    const { data, error } = await supabaseServer
      .from("albums")
      .select("id, title, artist, use_artist_variant, release_date, genre, tracklist, cover_url, spotify_id, ratings(id, user_id, score, one_line_review, created_at, updated_at)")
      .order("id")
      .range(offset, offset)
      .single();
    if (error || !data) return null;
    const resolved = await resolveArtistDisplay([data]);
    return resolved[0] as unknown as AlbumWithRatings;
  },
  ["today-album"],
  { tags: ["albums-page-meta"], revalidate: 43200 }
);

async function getTodayAlbum(): Promise<AlbumWithRatings | null> {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const hour = nowKst.getHours();
  const period = hour >= 6 && hour < 18 ? "낮" : "밤";
  const dateStr = nowKst.toISOString().slice(0, 10) + "-" + period;
  return _getTodayAlbumCached(dateStr);
}

function serverShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const getTickerReviews = unstable_cache(
  async (): Promise<TickerItem[]> => {
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
  },
  ["home-ticker"],
  { tags: ["profile-ratings", "artist-aliases"], revalidate: false }
);

const getControversialAlbums = unstable_cache(async (): Promise<ControversialItem[]> => {
  const { data } = await supabaseServer
    .from("ratings")
    .select("album_id, score, one_line_review, albums(id, title, artist, use_artist_variant, cover_url)");
  if (!data) return [];

  type RatingRow = {
    album_id: string;
    score: number;
    one_line_review: string | null;
    albums: { id: string; title: string; artist: string; use_artist_variant: boolean | null; cover_url: string | null } | null;
  };
  const rows = data as unknown as RatingRow[];

  const grouped = new Map<string, {
    scores: number[];
    reviews: { score: number; review: string | null }[];
    album: RatingRow["albums"];
  }>();

  for (const row of rows) {
    if (!row.albums) continue;
    const entry = grouped.get(row.album_id);
    if (entry) {
      entry.scores.push(row.score);
      entry.reviews.push({ score: row.score, review: row.one_line_review });
    } else {
      grouped.set(row.album_id, {
        scores: [row.score],
        reviews: [{ score: row.score, review: row.one_line_review }],
        album: row.albums,
      });
    }
  }

  const results: (Omit<ControversialItem, "album_artist_display"> & { album_use_artist_variant: boolean | null })[] = [];
  for (const [album_id, { scores, reviews, album }] of grouped) {
    if (scores.length < 2 || !album) continue;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const variance = max - min;
    if (variance < 2) continue;
    const highReview = reviews.find((r) => r.score === max && r.review)?.review ?? null;
    const lowReview  = reviews.find((r) => r.score === min && r.review)?.review ?? null;
    results.push({
      album_id,
      album_title: album.title,
      album_artist: album.artist,
      album_cover_url: album.cover_url,
      album_use_artist_variant: album.use_artist_variant ?? false,
      min_score: min,
      max_score: max,
      variance,
      rating_count: scores.length,
      high_review: highReview,
      low_review: lowReview,
    });
  }

  results.sort((a, b) => b.variance - a.variance || b.rating_count - a.rating_count);
  const top = results.slice(0, 3);
  if (top.length === 0) return [];

  const albumObjs = top.map((r) => ({ id: r.album_id, artist: r.album_artist, use_artist_variant: r.album_use_artist_variant ?? false }));
  const resolved = await resolveArtistDisplay(albumObjs);
  const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display]));

  return top.map((r) => ({
    ...r,
    album_artist_display: displayMap.get(r.album_id) ?? r.album_artist,
  }));
}, ["controversial-albums"], { tags: ["controversial"], revalidate: false });

const getWeeklyAlbums = unstable_cache(
  async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseServer
      .from("albums")
      .select("id, title, artist, use_artist_variant, cover_url")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(15);
    if (!data || data.length === 0) return [];
    return resolveArtistDisplay(data);
  },
  ["home-weekly-albums"],
  { tags: ["albums-page-meta"], revalidate: false }
);

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
};

export default async function HomePage() {
  const [
    totalCount,
    ratingsCount,
    todayAlbum,
    tickerItemsRaw,
    avatarMap,
    controversialAlbums,
    weeklyAlbums,
  ] = await Promise.all([
    getTotalCount(),
    getRatingsCount(),
    getTodayAlbum(),
    getTickerReviews(),
    fetchAllUserAvatarUrls(),
    getControversialAlbums(),
    getWeeklyAlbums(),
  ]);

  const tickerItems: TickerItem[] = tickerItemsRaw.map((item) => ({
    ...item,
    avatar_url: avatarMap[item.user_id] ?? null,
  }));

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Suspense><WelcomeOnboarding /></Suspense>

      <main style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>

        {/* ── 히어로 (blur 배경) ── */}
        <section style={{ position: "relative", overflow: "hidden" }}>
          <HomeHeroBackground initialUrl={todayAlbum?.cover_url ?? null} />

          <div style={{ position: "relative", zIndex: 1 }}>

            {/* 브랜딩 */}
            <div style={{ ...containerStyle, textAlign: "center", padding: "24px 24px 14px" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                청음의 기록
              </p>
              <h1
                style={{ color: "#ffffff", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.04em", marginBottom: 20 }}
                className="text-3xl sm:text-5xl"
              >
                아차청음사
              </h1>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 28 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#ffffff", fontWeight: 800, fontSize: 24, lineHeight: 1, letterSpacing: "-0.04em" }}>
                    <CountUp target={totalCount} />
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    앨범
                  </p>
                </div>
                <div style={{ width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#ffffff", fontWeight: 800, fontSize: 24, lineHeight: 1, letterSpacing: "-0.04em" }}>
                    <CountUp target={ratingsCount} />
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    평가
                  </p>
                </div>
              </div>
            </div>

            {/* 평베이어벨트 */}
            <div
              data-tour="home-ticker"
              style={{ color: "#ffffff" }}
            >
              <div style={containerStyle}>
                <ReviewTicker items={tickerItems} inline />
              </div>
            </div>

            {/* 오늘의 인연 + 갑론을박 */}
            <div style={{ ...containerStyle, padding: "28px 24px 36px" }}>
              <HomeSyncedGrid
                left={<HomeTodaySection initialAlbum={todayAlbum} />}
                right={<HomeFlipCard items={controversialAlbums} />}
                rightAttrs={{ "data-tour": "home-controversial" }}
              />
            </div>

          </div>
        </section>

        {/* ── 이번 주 청음 ── */}
        <section style={{ ...containerStyle, padding: "28px 24px 12px" }}>
          {weeklyAlbums.length > 0 ? (
            <HomeWeeklySection albums={weeklyAlbums as WeeklyAlbum[]} />
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "12px 0 4px", opacity: 0.6 }}>
              이번 주 새로 들어온 앨범이 없어요
            </p>
          )}
        </section>

      </main>
    </div>
  );
}
