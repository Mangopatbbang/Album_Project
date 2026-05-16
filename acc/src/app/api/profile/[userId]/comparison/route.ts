import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const n = xs.length;
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, xDen = 0, yDen = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean;
    const dy = ys[i] - yMean;
    num += dx * dy;
    xDen += dx * dx;
    yDen += dy * dy;
  }
  const den = Math.sqrt(xDen * yDen);
  if (den === 0) return null;
  return parseFloat((num / den).toFixed(4));
}

const computeComparison = unstable_cache(
  async (userId: string) => {
    const { data: user } = await supabaseServer
      .from("users")
      .select("id, display_name, emoji")
      .eq("id", userId)
      .single();
    if (!user) return null;

    const { data: otherUsersData } = await supabaseServer
      .from("users")
      .select("id, display_name, emoji")
      .neq("id", userId);
    const otherUsers = otherUsersData ?? [];

    const { data: myRatingsData } = await supabaseServer
      .from("ratings")
      .select("album_id, score")
      .eq("user_id", userId);

    const myMap = new Map<string, number>(
      (myRatingsData ?? []).map((r) => [r.album_id, r.score])
    );

    const otherRatings: { user_id: string; album_id: string; score: number }[] = [];
    if (otherUsers.length > 0) {
      for (let page = 0; ; page++) {
        const { data: pageData } = await supabaseServer
          .from("ratings")
          .select("user_id, album_id, score")
          .in("user_id", otherUsers.map((u) => u.id))
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (!pageData || pageData.length === 0) break;
        otherRatings.push(...pageData);
        if (pageData.length < 1000) break;
      }
    }

    const comparisons = otherUsers.map((other) => {
      const theirRatings = otherRatings.filter((r) => r.user_id === other.id);
      const common = theirRatings.filter((r) => myMap.has(r.album_id));
      const commonCount = common.length;
      if (commonCount < 3) {
        return { user: other, commonCount, pearson: null };
      }
      const xs = common.map((r) => myMap.get(r.album_id)!);
      const ys = common.map((r) => r.score);
      const pearson = pearsonCorrelation(xs, ys);
      return { user: other, commonCount, pearson };
    });

    const bestMatch =
      comparisons
        .filter((c) => c.commonCount >= 5 && c.pearson !== null)
        .sort((a, b) => (b.pearson ?? -1) - (a.pearson ?? -1))[0] ?? null;

    return { comparisons, bestMatch };
  },
  ["profile-comparison"],
  { tags: ["profile-ratings"], revalidate: 3600 }
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const result = await computeComparison(userId);
  if (!result) return NextResponse.json({ error: "user not found" }, { status: 404 });
  return NextResponse.json(result);
}
