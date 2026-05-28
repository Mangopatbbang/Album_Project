import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId");

  // userId가 있으면 이미 평가한 앨범 ID 목록 조회
  let excludeIds: string[] = [];
  if (userId) {
    const { data: rated } = await supabaseServer
      .from("ratings")
      .select("album_id")
      .eq("user_id", userId);
    excludeIds = (rated ?? []).map((r: { album_id: string }) => r.album_id);
  }

  // 미평가 앨범 수 조회 (없으면 전체에서 랜덤)
  let countQuery = supabaseServer.from("albums").select("id", { count: "exact", head: true });
  if (excludeIds.length > 0) countQuery = countQuery.not("id", "in", `(${excludeIds.join(",")})`);
  const { count } = await countQuery;

  // 미평가 앨범이 없으면 전체에서 랜덤
  const { count: totalCount, error: countError } = count === 0
    ? await supabaseServer.from("albums").select("id", { count: "exact", head: true })
    : { count, error: null };

  if (countError || !totalCount || totalCount === 0) {
    return NextResponse.json({ error: "앨범 없음" }, { status: 404 });
  }

  const offset = Math.floor(Math.random() * totalCount);
  const useExclude = count !== 0 && excludeIds.length > 0;

  let query = supabaseServer
    .from("albums")
    .select("id, title, artist, use_artist_variant, release_date, genre, tracklist, cover_url, spotify_id, ratings(id, user_id, score, one_line_review, created_at, updated_at)")
    .order("id")
    .range(offset, offset);
  if (useExclude) query = query.not("id", "in", `(${excludeIds.join(",")})`);

  const { data, error } = await query.single();
  if (error || !data) return NextResponse.json({ error: "조회 실패" }, { status: 500 });

  const [resolved] = await resolveArtistDisplay([data]);
  const ratings = (data.ratings ?? []) as { user_id: string; score: number }[];
  const scores = ratings.map((r) => r.score);
  const avg = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  return NextResponse.json({ ...resolved, ratings, avg });
}
