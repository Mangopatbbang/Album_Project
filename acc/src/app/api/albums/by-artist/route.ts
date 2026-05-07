import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

const SELECT = "id, title, artist, use_artist_variant, extra_artists, year, release_date, genre, cover_url, spotify_id, soundcloud_url, ratings(user_id, score)";

export async function GET(req: NextRequest) {
  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name 파라미터 필수", albums: [], avg: null }, { status: 400 });

  // 두 쿼리를 병렬 실행 — .eq() / .ilike()는 Supabase 클라이언트가 내부적으로
  // 파라미터 바인딩하므로 콤마·괄호 등 특수문자 포함 아티스트명도 안전하게 처리됨
  const [r1, r2] = await Promise.all([
    supabaseServer
      .from("albums")
      .select(SELECT)
      .eq("artist", name)
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabaseServer
      .from("albums")
      .select(SELECT)
      .ilike("extra_artists", `%${name}%`)
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  if (r1.error && r2.error) return NextResponse.json({ error: r1.error.message, albums: [], avg: null }, { status: 500 });

  // 병합 + id 기준 dedup + release_date 내림차순 재정렬 (null은 맨 뒤)
  const seen = new Set<string>();
  const merged = [...(r1.data ?? []), ...(r2.data ?? [])]
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => {
      const da = a.release_date ?? "";
      const db = b.release_date ?? "";
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    });

  const error = r1.error && r2.error ? r1.error : null;
  if (error) return NextResponse.json({ error: error.message, albums: [], avg: null }, { status: 500 });

  const resolvedMerged = await resolveArtistDisplay(merged);
  const albums = resolvedMerged.map((album) => {
    const ratings = (album.ratings ?? []) as { user_id: string; score: number }[];
    const scores = ratings.map((r) => r.score);
    const avg = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;
    return { ...album, ratings, avg };
  });

  // 전체 평균
  const allScores = albums.flatMap((a) => (a.ratings as { score: number }[]).map((r) => r.score));
  const totalAvg = allScores.length > 0
    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
    : null;

  return NextResponse.json({ albums, avg: totalAvg });
}
