import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { fetchAliasMap, applyArtistDisplay } from "@/lib/artistDisplay";
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

  // 두 캐시 함수를 병렬로 실행 — sequential이면 왕복 2회 DB 쿼리가 순차적으로 발생
  const [data, aliasMap] = await Promise.all([
    fetchAlbumForModal(id),
    fetchAliasMap(),
  ]);

  if (!data) return null;

  const [resolved] = applyArtistDisplay([data], aliasMap);
  const album = resolved as unknown as AlbumWithRatings;

  return <InterceptedAlbumModal album={album} />;
}
