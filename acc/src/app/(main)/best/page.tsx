import type { Metadata } from "next";
import PageHeader from "@/components/layout/PageHeader";
import { fetchAllAlbumsWithRatings, getBestDataForPage, getHiddenGems } from "@/lib/stats";
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
  const { yearData, genreData, artistData, allRanked, domesticRanked, foreignRanked } = getBestDataForPage(albums);
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
