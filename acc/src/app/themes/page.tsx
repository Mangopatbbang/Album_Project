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
import ThemesPageClient from "./ThemesPageClient";

export default async function ThemesPage() {
  const albums = await fetchAllAlbumsWithRatings();

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
        <ThemesPageClient themeData={themeData} />
      </main>
    </div>
  );
}
