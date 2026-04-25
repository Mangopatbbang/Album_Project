import Link from "next/link";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { AlbumWithRatings } from "@/types";
import RecentAlbumsSection from "@/components/album/RecentAlbumsSection";
import { fetchAllUserAvatarUrls } from "@/lib/stats";
import RandomButton from "@/components/album/RandomButton";
import HeroLogoutButton from "@/components/ui/HeroLogoutButton";
import CountUp from "@/components/ui/CountUp";
import MobileLoginHint from "@/components/ui/MobileLoginHint";
import HomePopup from "@/components/ui/HomePopup";
import HomeSearchBar from "@/components/ui/HomeSearchBar";
import ReviewTicker, { TickerItem } from "@/components/ui/ReviewTicker";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

async function getRecentAlbums() {
  const { data } = await supabaseServer
    .from("albums")
    .select("id, title, artist, use_artist_variant, year, genre, cover_url, ratings(id, user_id, score, one_line_review, created_at, updated_at)")
    .order("created_at", { ascending: false })
    .limit(4);
  if (!data) return [];
  return resolveArtistDisplay(data);
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

async function getTotalCount() {
  const { count } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

const containerStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
};

export default async function HomePage() {
  const [recentAlbums, totalCount, tickerItemsRaw, avatarMap] = await Promise.all([
    getRecentAlbums(),
    getTotalCount(),
    getTickerReviews(),
    fetchAllUserAvatarUrls(),
  ]);
  const tickerItems: TickerItem[] = tickerItemsRaw.map((item) => ({
    ...item,
    avatar_url: avatarMap[item.user_id] ?? null,
  }));

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <HomePopup />
      <Header />

      <main>
        {/* 히어로 */}
        <section style={{ ...containerStyle, textAlign: "center", position: "relative", padding: "16px 24px 10px" }}>
          <div style={{ position: "absolute", top: 16, left: 20 }}>
            <RandomButton />
          </div>
          <div style={{ position: "absolute", top: 16, right: 20 }}>
            <HeroLogoutButton />
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            청음의 기록
          </p>
          <h1
            style={{
              color: "var(--text)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
            }}
            className="text-3xl sm:text-6xl mb-1"
          >
            아차청음사
          </h1>
          <p style={{ color: "var(--text-sub)", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 8 }} className="text-3xl sm:text-[48px]">
            <CountUp target={totalCount} />
          </p>
          <MobileLoginHint />
          <div style={{ marginTop: 8 }}>
            <ReviewTicker items={tickerItems} inline />
          </div>
        </section>

        {/* 검색바 */}
        <section style={{ ...containerStyle, padding: "0 0 12px" }}>
          <HomeSearchBar />
        </section>

        {/* 최근 청음 */}
        <section style={{ ...containerStyle, padding: "0 24px 12px" }}>
          <div className="flex items-center justify-between mb-4">
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
      </main>
    </div>
  );
}
