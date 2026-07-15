import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchAllAlbumsWithRatings, getBestDataForPage, getHiddenGems } from "@/lib/stats";
import { supabaseServer } from "@/lib/supabase";
import BestPageClient from "./BestPageClient";
import BestTabBar from "./BestTabBar";
import DiscoverClient from "./DiscoverClient";
import ThemesPageClient, { type Playlist } from "@/app/(main)/themes/ThemesPageClient";
import Spinner from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "청음감",
  description: "아차청음사 청음감 — 랭킹, 발견, 컬렉션",
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

export default async function BestPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { tab = "ranking", view = "year" } = await searchParams;

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px calc(80px + env(safe-area-inset-bottom))", overflowX: "hidden" }}>

        {/* 타이틀 */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "var(--text)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.04em", marginBottom: 4 }}>
            청음감
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {tab === "discover" ? "아직 발견되지 않은 명반" : tab === "collections" ? "테마별로 엮은 컬렉션" : "멤버가 선정한 명반 순위"}
          </p>
        </div>

        {/* 서브탭 */}
        <Suspense fallback={<div style={{ height: 43, borderBottom: "1px solid var(--border)", marginBottom: 28 }} />}>
          <BestTabBar />
        </Suspense>

        {/* 탭 콘텐츠 */}
        {tab === "ranking" && (
          <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={22} /></div>}>
            <RankingContent initialView={view} />
          </Suspense>
        )}
        {tab === "discover" && (
          <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={22} /></div>}>
            <DiscoverContent />
          </Suspense>
        )}
        {tab === "collections" && (
          <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={22} /></div>}>
            <CollectionsContent />
          </Suspense>
        )}

      </main>
    </div>
  );
}

async function RankingContent({ initialView }: { initialView: string }) {
  const albums = await fetchAllAlbumsWithRatings();
  const { yearData, genreData, artistData, allRanked, domesticRanked, foreignRanked } = getBestDataForPage(albums);

  return (
    <BestPageClient
      yearData={yearData}
      genreData={genreData}
      artistData={artistData}
      allRanked={allRanked}
      domesticRanked={domesticRanked}
      foreignRanked={foreignRanked}
      initialView={initialView}
    />
  );
}

async function DiscoverContent() {
  const albums = await fetchAllAlbumsWithRatings();
  const hiddenGems = getHiddenGems(albums);
  return <DiscoverClient gems={hiddenGems} />;
}

async function CollectionsContent() {
  const playlists = await getPlaylists();
  return <ThemesPageClient initialPlaylists={playlists as unknown as Playlist[]} />;
}
