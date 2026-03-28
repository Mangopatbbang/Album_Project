import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, tracklist, ratings(user_id, score, one_line_review)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "앨범을 찾을 수 없습니다" }, { status: 404 });
  }

  const ratings = (data.ratings ?? []) as { user_id: string; score: number; one_line_review: string | null }[];
  const scores = ratings.map((r) => r.score);
  const avg = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  return NextResponse.json({ ...data, ratings, avg });
}
