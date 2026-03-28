import Header from "@/components/layout/Header";
import AlbumList from "@/components/album/AlbumList";
import { supabaseServer } from "@/lib/supabase";
import { AlbumWithRatings } from "@/types";

const containerStyle = {
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "0 24px",
};

async function getInitialAlbums() {
  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, created_at, ratings(user_id, score)")
    .order("created_at", { ascending: false })
    .limit(31);

  if (error || !data) return { items: [], hasMore: false, nextCursor: null };

  const hasMore = data.length > 30;
  const page = hasMore ? data.slice(0, 30) : data;
  const items = page.map((album) => {
    const ratings = (album.ratings ?? []) as { user_id: string; score: number }[];
    const scores = ratings.map((r) => r.score);
    const avg =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null;
    return { ...album, ratings, avg } as AlbumWithRatings;
  });

  return {
    items,
    hasMore,
    nextCursor: hasMore ? (page[page.length - 1].created_at ?? null) : null,
  };
}

async function getGenres(): Promise<string[]> {
  const { data } = await supabaseServer
    .from("albums")
    .select("genre")
    .not("genre", "is", null)
    .limit(10000);

  if (!data) return [];
  const unique = [...new Set(data.map((d) => d.genre).filter(Boolean))].sort();
  return unique as string[];
}

export default async function AlbumsPage() {
  const [{ items, hasMore, nextCursor }, genres] = await Promise.all([
    getInitialAlbums(),
    getGenres(),
  ]);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />

      <div style={{ ...containerStyle, paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: "-0.03em",
            }}
          >
            음반고
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {items.length > 0 ? `${items.length}장+` : ""} 청음된 음반
          </p>
        </div>

        <AlbumList
          initialAlbums={items}
          initialHasMore={hasMore}
          initialNextCursor={nextCursor}
          genres={genres}
        />
      </div>
    </div>
  );
}
