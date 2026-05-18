import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import { AlbumWithRatings } from "@/types";
import StandaloneAlbumModal from "./StandaloneAlbumModal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabaseServer
    .from("albums")
    .select("title, artist, cover_url")
    .eq("id", id)
    .single();
  if (!data) return { title: "앨범" };
  return {
    title: `${data.title} — ${data.artist}`,
    openGraph: {
      images: data.cover_url ? [data.cover_url] : [],
    },
  };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("albums")
    .select(
      "id, title, artist, use_artist_variant, year, release_date, genre, tracklist, cover_url, spotify_id, soundcloud_url, ratings(id, user_id, score, one_line_review, created_at, updated_at)"
    )
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const [resolved] = await resolveArtistDisplay([data]);
  const album = resolved as unknown as AlbumWithRatings;

  return <StandaloneAlbumModal album={album} />;
}
