import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import { AlbumWithRatings } from "@/types";
import InterceptedAlbumModal from "./InterceptedAlbumModal";

const fetchAlbumForModal = unstable_cache(
  async (id: string) => {
    const { data } = await supabaseServer
      .from("albums")
      .select(
        "id, title, artist, use_artist_variant, extra_artists, release_date, genre, tracklist, cover_url, spotify_id, soundcloud_url, ratings(user_id, score, one_line_review)"
      )
      .eq("id", id)
      .single();
    return data ?? null;
  },
  ["album-modal-data"],
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

  const [resolved] = await resolveArtistDisplay([data]);
  const album = resolved as unknown as AlbumWithRatings;

  return <InterceptedAlbumModal album={album} />;
}
