import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  // 세 쿼리 병렬: artist 직접 검색 + alias variant_name 검색 + search alias 검색
  const [r1, r2, r3] = await Promise.all([
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
    supabaseServer
      .from("artist_search_aliases")
      .select("spotify_name")
      .ilike("alias", `%${q}%`)
      .limit(20),
  ]);

  const directArtists = (r1.data ?? []).map((a: { artist: string }) => a.artist);
  const aliasSpotifyNames = [
    ...(r2.data ?? []).map((a: { spotify_name: string }) => a.spotify_name),
    ...(r3.data ?? []).map((a: { spotify_name: string }) => a.spotify_name),
  ];

  const merged = [...new Set([...directArtists, ...aliasSpotifyNames])].slice(0, 10);
  return NextResponse.json(merged);
}
