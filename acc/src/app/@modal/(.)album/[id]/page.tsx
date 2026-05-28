import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import { AlbumWithRatings } from "@/types";
import InterceptedAlbumModal from "./InterceptedAlbumModal";

export default async function InterceptedAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("albums")
    .select(
      "id, title, artist, use_artist_variant, release_date, genre, tracklist, cover_url, spotify_id, soundcloud_url, ratings(id, user_id, score, one_line_review, created_at, updated_at)"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const [resolved] = await resolveArtistDisplay([data]);
  const album = resolved as unknown as AlbumWithRatings;

  return <InterceptedAlbumModal album={album} />;
}
