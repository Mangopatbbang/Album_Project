import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  // Fetch all IDs first (lightweight) to avoid gap issues with offset-based random
  const allIds: string[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabaseServer
      .from("albums")
      .select("id")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allIds.push(...data.map((r: { id: string }) => r.id));
    if (data.length < 1000) break;
  }

  if (allIds.length === 0) return NextResponse.json({ error: "앨범 없음" }, { status: 404 });

  const randomId = allIds[Math.floor(Math.random() * allIds.length)];

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, ratings(id, user_id, score, one_line_review, created_at, updated_at)")
    .eq("id", randomId)
    .single();

  if (error || !data) return NextResponse.json({ error: "조회 실패" }, { status: 500 });

  const ratings = (data.ratings ?? []) as { user_id: string; score: number }[];
  const scores = ratings.map((r) => r.score);
  const avg = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  return NextResponse.json({ ...data, ratings, avg });
}
