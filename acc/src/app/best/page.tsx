import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import PageHeader from "@/components/layout/PageHeader";
import { fetchAllAlbumsWithRatings, getBestByYear, getBestByGenre, getBestByArtist, getRankedAll, getHiddenGems, AlbumStat } from "@/lib/stats";
import BestPageClient from "./BestPageClient";

export const metadata: Metadata = {
  title: "청음감",
  description: "아차청음사 청음감 — 통합·연도별·장르별·아티스트별",
};

export default async function BestPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "year" } = await searchParams;
  const albums = await fetchAllAlbumsWithRatings();

  function computeSections(albs: typeof albums): [string, AlbumStat[]][] {
    if (view === "genre") return [...getBestByGenre(albs).entries()];
    if (view === "artist") return [...getBestByArtist(albs).entries()];
    return [...getBestByYear(albs).entries()];
  }

  const sections = computeSections(albums);
  const domesticSections = computeSections(albums.filter((a) => a.region === "국내"));
  const foreignSections = computeSections(albums.filter((a) => a.region === "해외"));

  const allRanked = getRankedAll(albums);
  const domesticRanked = getRankedAll(albums.filter((a) => a.region === "국내"));
  const foreignRanked = getRankedAll(albums.filter((a) => a.region === "해외"));
  const hiddenGems = getHiddenGems(albums);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px calc(80px + env(safe-area-inset-bottom))" }}>
        <PageHeader title="청음감" subtitle="멤버가 선정한 명반 순위" />

        <BestPageClient
          allSections={sections}
          domesticSections={domesticSections}
          foreignSections={foreignSections}
          allRanked={allRanked}
          domesticRanked={domesticRanked}
          foreignRanked={foreignRanked}
          hiddenGems={hiddenGems}
          view={view}
        />
      </main>
    </div>
  );
}
