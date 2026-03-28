import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const { count } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true });

  if (!count) return NextResponse.json({ error: "앨범 없음" }, { status: 404 });

  const offset = Math.floor(Math.random() * count);

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, ratings(id, user_id, score, one_line_review, created_at, updated_at)")
    .range(offset, offset);

  if (error || !data?.[0]) return NextResponse.json({ error: "조회 실패" }, { status: 500 });

  const album = data[0];
  const ratings = (album.ratings ?? []) as { user_id: string; score: number }[];
  const scores = ratings.map((r) => r.score);
  const avg = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  return NextResponse.json({ ...album, ratings, avg });
}
