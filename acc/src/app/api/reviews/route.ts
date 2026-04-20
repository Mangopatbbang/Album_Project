import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

export type ReviewItem = {
  albumId: string;
  albumTitle: string;
  artist: string;
  artistDisplay: string;
  coverUrl: string | null;
  genre: string | null;
  userId: string;
  score: number;
  review: string;
  likedBy: string[];
  updatedAt: string;
  commentCount?: number;
};

const LIMIT = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId")?.trim() || null;
  const albumId = searchParams.get("albumId")?.trim() || null;
  const minScore = Number(searchParams.get("minScore") ?? 1);
  const maxScore = Number(searchParams.get("maxScore") ?? 8);
  const sort = searchParams.get("sort") ?? "latest";
  const offset = Number(searchParams.get("offset") ?? 0);

  let query = supabaseServer
    .from("ratings")
    .select("user_id, score, one_line_review, liked_by, updated_at, albums(id, title, artist, use_artist_variant, cover_url, genre)")
    .not("one_line_review", "is", null)
    .neq("one_line_review", "")
    .gte("score", minScore)
    .lte("score", maxScore)
    .range(offset, offset + LIMIT);

  if (userId) query = (query as typeof query).eq("user_id", userId);
  if (albumId) query = (query as typeof query).eq("album_id", albumId);
  if (sort === "latest") query = (query as typeof query).order("updated_at", { ascending: false });

  const { data, error } = await query;
  if (error || !data) return NextResponse.json({ items: [], hasMore: false }, { status: 500 });

  type AlbumRow = { id: string; title: string; artist: string; use_artist_variant: boolean | null; cover_url: string | null; genre: string | null };
  const albumObjects = data
    .map((r) => (r.albums as unknown) as AlbumRow | null)
    .filter((a): a is AlbumRow => a != null);
  const resolved = await resolveArtistDisplay(albumObjects);
  const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display ?? a.artist]));

  let items: ReviewItem[] = data
    .map((r) => {
      const album = (r.albums as unknown) as AlbumRow | null;
      if (!album) return null;
      return {
        albumId: album.id,
        albumTitle: album.title,
        artist: album.artist,
        artistDisplay: displayMap.get(album.id) ?? album.artist,
        coverUrl: album.cover_url ?? null,
        genre: album.genre ?? null,
        userId: r.user_id,
        score: r.score,
        review: r.one_line_review as string,
        likedBy: r.liked_by ? r.liked_by.split(",").filter(Boolean) : [],
        updatedAt: r.updated_at,
      };
    })
    .filter((x): x is ReviewItem => x != null);

  if (sort === "most_liked") {
    items = items.sort((a, b) => b.likedBy.length - a.likedBy.length);
  }

  return NextResponse.json({ items, hasMore: items.length === LIMIT + 1 });
}
