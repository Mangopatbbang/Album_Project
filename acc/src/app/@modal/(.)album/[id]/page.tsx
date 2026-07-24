import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay, fetchAliasMap } from "@/lib/artistDisplay";
import { AlbumWithRatings } from "@/types";
import InterceptedAlbumModal from "./InterceptedAlbumModal";

const fetchAlbumForModal = unstable_cache(
  async (id: string) => {
    const { data } = await supabaseServer
      .from("albums")
      .select(
        "id, title, artist, use_artist_variant, extra_artists, release_date, genre, region, tracklist, track_durations, cover_url, spotify_id, soundcloud_url, added_by, ratings(user_id, score, one_line_review, liked_tracks, liked_by)"
      )
      .eq("id", id)
      .single();
    return data ?? null;
  },
  ["album-modal-data-v2"],
  { revalidate: 30 }
);

export default async function InterceptedAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchAlbumForModal(id);

  if (!data) return null;

  const [[resolved], aliasMap] = await Promise.all([
    resolveArtistDisplay([data]),
    fetchAliasMap(),
  ]);

  const ratings = (data.ratings ?? []) as Array<{
    user_id: string;
    score: number;
    one_line_review: string | null;
    liked_tracks: string | null;
    liked_by: string | null;
  }>;

  const scores = ratings.map((r) => r.score);
  const avg =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : undefined;

  const extra_artists_display: string[] = resolved.extra_artists
    ? resolved.extra_artists
        .split(";")
        .map((s: string) => {
          const t = s.trim();
          return aliasMap.get(t.toLowerCase()) ?? t;
        })
        .filter(Boolean)
    : [];

  const album = {
    ...resolved,
    avg,
    extra_artists_display,
    ratings,
  } as unknown as AlbumWithRatings;

  return <InterceptedAlbumModal album={album} />;
}
