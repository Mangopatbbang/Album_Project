import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { USERS } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const user = USERS.find((u) => u.id === userId);
  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // 본인 평점 fetch
  const { data: myRatingsData } = await supabaseServer
    .from("ratings")
    .select("album_id, score")
    .eq("user_id", userId);

  const myMap = new Map<string, number>(
    (myRatingsData ?? []).map((r) => [r.album_id, r.score])
  );

  // 다른 멤버 평점 fetch (페이지 루프)
  const otherUsers = USERS.filter((u) => u.id !== userId);
  const otherRatings: { user_id: string; album_id: string; score: number }[] = [];
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

  const comparisons = otherUsers.map((other) => {
    const theirRatings = otherRatings.filter((r) => r.user_id === other.id);
    const common = theirRatings.filter((r) => myMap.has(r.album_id));
    const commonCount = common.length;
    if (commonCount === 0) return { user: other, commonCount: 0, diff: null };

    const mae =
      common.reduce((s, r) => s + Math.abs((myMap.get(r.album_id) ?? 0) - r.score), 0) /
      commonCount;
    return { user: other, commonCount, diff: parseFloat(mae.toFixed(2)) };
  });

  const bestMatch =
    comparisons
      .filter((c) => c.commonCount >= 5 && c.diff !== null)
      .sort((a, b) => a.diff! - b.diff!)[0] ?? null;

  return NextResponse.json({ comparisons, bestMatch });
}
