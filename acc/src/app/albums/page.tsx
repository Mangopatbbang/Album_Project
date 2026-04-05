import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import AlbumList from "@/components/album/AlbumList";
import { supabaseServer } from "@/lib/supabase";
import { AlbumWithRatings } from "@/types";

export const metadata: Metadata = {
  title: "음반고",
  description: "아차청음사 전체 음반 목록",
};

const containerStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 16px",
};

async function getInitialAlbums() {
  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, created_at, ratings(user_id, score)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, 30);

  if (error || !data) return { items: [], hasMore: false, nextOffset: null };

  const hasMore = data.length > 30;
  const page = hasMore ? data.slice(0, 30) : data;
  const items = page.map((album) => {
    const ratings = (album.ratings ?? []) as { user_id: string; score: number }[];
    const scores = ratings.map((r) => r.score);
    const avg =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null;
    return { ...album, ratings, avg } as unknown as AlbumWithRatings;
  });

  return {
    items,
    hasMore,
    nextOffset: hasMore ? 30 : null,
  };
}

async function getGenres(): Promise<string[]> {
  const all: { genre: string | null }[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabaseServer
      .from("albums")
      .select("genre")
      .not("genre", "is", null)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  const unique = [...new Set(all.map((d) => d.genre).filter(Boolean))].sort();
  return unique as string[];
}

async function getTotalCount(): Promise<number> {
  const { count } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AlbumsPage() {
  const [{ items, hasMore, nextOffset }, genres, totalCount] = await Promise.all([
    getInitialAlbums(),
    getGenres(),
    getTotalCount(),
  ]);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />

      <main style={{ ...containerStyle, paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "-0.03em",
            }}
          >
            음반고
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {totalCount > 0 ? `${totalCount}장` : ""} 청음된 음반
          </p>
        </div>

        <AlbumList
          initialAlbums={items}
          initialHasMore={hasMore}
          initialNextOffset={nextOffset}
          genres={genres}
        />
      </main>
    </div>
  );
}
