import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  // 두 쿼리 병렬: artist 직접 검색 + alias variant_name 검색
  const [r1, r2] = await Promise.all([
    supabaseServer
      .from("albums")
      .select("artist")
      .ilike("artist", `%${q}%`)
      .limit(60),
    supabaseServer
      .from("artist_aliases")
      .select("spotify_name, variant_name")
      .ilike("variant_name", `%${q}%`)
      .limit(20),
  ]);

  // spotify_name으로 앨범 artist 존재 여부 확인 후 병합
  const directArtists = (r1.data ?? []).map((a: { artist: string }) => a.artist);

  // alias 매칭된 spotify_names — 실제 앨범에 있는 것만 포함
  const aliasSpotifyNames = (r2.data ?? []).map((a: { spotify_name: string; variant_name: string }) => a.spotify_name);

  const merged = [...new Set([...directArtists, ...aliasSpotifyNames])].slice(0, 10);
  return NextResponse.json(merged);
}
