import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import {
  fetchAllAlbumsWithRatings,
  getEightClub,
  getUnanimous,
  getControversial,
  getHiddenGems,
  getArtistBest,
  AlbumStat,
} from "@/lib/stats";
import { supabaseServer } from "@/lib/supabase";
import ThemesPageClient from "./ThemesPageClient";

export const metadata: Metadata = {
  title: "청음집",
  description: "선곡집과 테마별 음반 모음",
};

async function getPlaylists() {
  const { data } = await supabaseServer
    .from("playlists")
    .select(`
      id, title, user_id, created_at,
      playlist_entries(id, sort_order, comment, albums(id, title, artist, cover_url))
    `)
    .order("created_at", { ascending: false });

  return (data ?? []).map((p) => ({
    ...p,
    playlist_entries: (p.playlist_entries ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  }));
}

export default async function ThemesPage() {
  const [albums, playlists] = await Promise.all([
    fetchAllAlbumsWithRatings(),
    getPlaylists(),
  ]);

  const themeData: Record<string, AlbumStat[]> = {
    eight_club: getEightClub(albums),
    unanimous: getUnanimous(albums),
    artist_best: getArtistBest(albums),
    hidden_gems: getHiddenGems(albums),
    controversial: getControversial(albums).slice(0, 30),
  };

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em", marginBottom: 32 }}>
          청음집
        </p>
        <ThemesPageClient themeData={themeData} initialPlaylists={playlists as any} />
      </main>
    </div>
  );
}
