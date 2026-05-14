import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

const SELECT = "id, title, artist, use_artist_variant, extra_artists, year, release_date, genre, cover_url, spotify_id, soundcloud_url, ratings(user_id, score)";

export async function GET(req: NextRequest) {
  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name 파라미터 필수", albums: [], avg: null }, { status: 400 });

  // SQL LIKE 와일드카드 이스케이프 (% _ 를 리터럴로 처리)
  const safeName = name.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // 두 쿼리를 병렬 실행
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
      .ilike("extra_artists", `%${safeName}%`)
      .order("release_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  if (r1.error && r2.error) return NextResponse.json({ error: r1.error.message, albums: [], avg: null }, { status: 500 });

  // extra_artists는 "A;B;C" 형태 — 부분 문자열 오매칭 방지를 위해 토큰 단위 정확 매칭
  const nameLower = name.toLowerCase();
  const extraFiltered = (r2.data ?? []).filter((a) =>
    (a.extra_artists ?? "").split(";").some((t: string) => t.trim().toLowerCase() === nameLower)
  );

  // 병합 + id 기준 dedup + release_date 내림차순 재정렬 (null은 맨 뒤)
  const seen = new Set<string>();
  const merged = [...(r1.data ?? []), ...extraFiltered]
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
