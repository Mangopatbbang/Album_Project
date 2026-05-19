import type { Metadata } from "next";
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
  const domAlbums = albums.filter((a) => a.region === "국내");
  const forAlbums = albums.filter((a) => a.region === "해외");

  const yearData = {
    all: [...getBestByYear(albums).entries()] as [string, AlbumStat[]][],
    domestic: [...getBestByYear(domAlbums).entries()] as [string, AlbumStat[]][],
    foreign: [...getBestByYear(forAlbums).entries()] as [string, AlbumStat[]][],
  };
  const genreData = {
    all: [...getBestByGenre(albums).entries()] as [string, AlbumStat[]][],
    domestic: [...getBestByGenre(domAlbums).entries()] as [string, AlbumStat[]][],
    foreign: [...getBestByGenre(forAlbums).entries()] as [string, AlbumStat[]][],
  };
  const artistData = {
    all: [...getBestByArtist(albums).entries()] as [string, AlbumStat[]][],
    domestic: [...getBestByArtist(domAlbums).entries()] as [string, AlbumStat[]][],
    foreign: [...getBestByArtist(forAlbums).entries()] as [string, AlbumStat[]][],
  };

  const allRanked = getRankedAll(albums);
  const domesticRanked = getRankedAll(domAlbums);
  const foreignRanked = getRankedAll(forAlbums);
  const hiddenGems = getHiddenGems(albums);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px calc(80px + env(safe-area-inset-bottom))", overflowX: "hidden" }}>
        <PageHeader title="청음감" subtitle="멤버가 선정한 명반 순위" />

        <BestPageClient
          yearData={yearData}
          genreData={genreData}
          artistData={artistData}
          allRanked={allRanked}
          domesticRanked={domesticRanked}
          foreignRanked={foreignRanked}
          hiddenGems={hiddenGems}
          initialView={view}
        />
      </main>
    </div>
  );
}
