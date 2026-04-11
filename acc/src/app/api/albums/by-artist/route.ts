import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// PostgREST .or() 쿼리 안에서 파서를 깨는 특수문자 제거
function escapeSearch(s: string) {
  return s.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ albums: [], avg: null }, { status: 400 });

  const safe = escapeSearch(name);

  // 주 아티스트 정확 일치 + extra_artists 부분 일치 (콜라보 참여작 포함)
  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, extra_artists, year, release_date, genre, cover_url, spotify_id, ratings(user_id, score)")
    .or(`artist.eq.${safe},extra_artists.ilike.%${safe}%`)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ albums: [], avg: null }, { status: 500 });

  const albums = (data ?? []).map((album) => {
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
