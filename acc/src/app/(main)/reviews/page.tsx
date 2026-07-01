import type { Metadata } from "next";
import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Spinner from "@/components/ui/Spinner";
import ReviewsClient from "./ReviewsClient";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import type { ReviewItem } from "@/app/api/reviews/route";

export const metadata: Metadata = {
  title: "청음평",
  description: "아차청음사 멤버들의 한줄 소감 모음",
};

type AlbumRow = {
  id: string; title: string; artist: string;
  use_artist_variant: boolean | null; extra_artists: string | null;
  cover_url: string | null; genre: string | null;
};

async function getBestReviews(): Promise<ReviewItem[]> {
  const { data } = await supabaseServer
    .from("ratings")
    .select("user_id, score, one_line_review, liked_by, updated_at, albums(id, title, artist, use_artist_variant, extra_artists, cover_url, genre)")
    .not("one_line_review", "is", null)
    .neq("one_line_review", "")
    .not("liked_by", "is", null)
    .neq("liked_by", "");

  if (!data?.length) return [];

  const sorted = [...data]
    .sort((a, b) => {
      const aL = (a.liked_by as string).split(",").filter(Boolean).length;
      const bL = (b.liked_by as string).split(",").filter(Boolean).length;
      return bL - aL;
    })
    .slice(0, 3);

  const albumObjects = sorted
    .map((r) => (r.albums as unknown) as AlbumRow | null)
    .filter((a): a is AlbumRow => a !== null);

  const resolved = await resolveArtistDisplay(albumObjects);
  const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display ?? a.artist]));

  return sorted
    .map((r): ReviewItem | null => {
      const album = (r.albums as unknown) as AlbumRow | null;
      if (!album) return null;
      return {
        albumId: album.id,
        albumTitle: album.title,
        artist: album.artist,
        artistDisplay: displayMap.get(album.id) ?? album.artist,
        coverUrl: album.cover_url ?? null,
        genre: album.genre ?? null,
        userId: r.user_id,
        score: r.score,
        review: r.one_line_review as string,
        likedBy: (r.liked_by as string).split(",").filter(Boolean),
        updatedAt: r.updated_at,
      };
    })
    .filter((x): x is ReviewItem => x !== null);
}

export default async function ReviewsPage() {
  const bestReviews = await getBestReviews();

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px calc(80px + env(safe-area-inset-bottom))" }}>
        <PageHeader title="청음평" subtitle="멤버들의 한줄 소감 모음" />
        <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size={22} /></div>}>
          <ReviewsClient bestReviews={bestReviews} />
        </Suspense>
      </main>
    </div>
  );
}
