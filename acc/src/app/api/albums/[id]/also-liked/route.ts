import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// 같은 유저가 A, B 둘 다 7점 이상 준 앨범 쌍 → co-occurrence 기반 추천
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;

  // 이 앨범을 7점 이상 준 유저 목록
  const { data: highRaters } = await supabaseServer
    .from("ratings")
    .select("user_id")
    .eq("album_id", albumId)
    .gte("score", 7);

  if (!highRaters?.length) return NextResponse.json({ items: [] });

  const userIds = highRaters.map((r) => r.user_id);

  // 같은 유저들이 7점 이상 준 다른 앨범
  const { data: coRatings } = await supabaseServer
    .from("ratings")
    .select("album_id, user_id, score")
    .in("user_id", userIds)
    .gte("score", 7)
    .neq("album_id", albumId);

  if (!coRatings?.length) return NextResponse.json({ items: [] });

  // album_id별 co-rater 수 집계
  const coMap = new Map<string, { users: Set<string>; totalScore: number }>();
  for (const r of coRatings) {
    const entry = coMap.get(r.album_id) ?? { users: new Set(), totalScore: 0 };
    entry.users.add(r.user_id);
    entry.totalScore += r.score;
    coMap.set(r.album_id, entry);
  }

  // 2명 이상 겹치는 앨범만, 겹침 수 내림차순
  const topIds = [...coMap.entries()]
    .filter(([, v]) => v.users.size >= 2)
    .sort((a, b) => b[1].users.size - a[1].users.size)
    .slice(0, 5)
    .map(([id]) => id);

  if (!topIds.length) return NextResponse.json({ items: [] });

  const { data: albums } = await supabaseServer
    .from("albums")
    .select("id, title, artist, cover_url, spotify_id")
    .in("id", topIds);

  const items = topIds
    .map((id) => {
      const album = albums?.find((a) => a.id === id);
      if (!album) return null;
      const entry = coMap.get(id)!;
      return {
        album_id: id,
        title: album.title,
        artist: album.artist,
        cover_url: album.cover_url ?? null,
        spotify_id: album.spotify_id ?? null,
        co_count: entry.users.size,
        avg_score: Math.round((entry.totalScore / entry.users.size) * 10) / 10,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}
