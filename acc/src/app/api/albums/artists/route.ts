import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { fetchAliasMap } from "@/lib/artistDisplay";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  // SQL LIKE 와일드카드 이스케이프 (% → \%, _ → \_)
  const esc = q.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // 네 쿼리 병렬: artist 직접 검색 + alias variant_name 검색 + search alias 검색 + alias 전체맵
  const [r1, r2, r3, aliasMap] = await Promise.all([
    supabaseServer.from("albums").select("artist").ilike("artist", `%${esc}%`).limit(60),
    supabaseServer.from("artist_aliases").select("spotify_name, variant_name").ilike("variant_name", `%${esc}%`).limit(20),
    supabaseServer.from("artist_search_aliases").select("spotify_name").ilike("alias", `%${esc}%`).limit(20),
    fetchAliasMap(),
  ]);

  // Map<spotify_name, display_name> — 내부 spotify_name 기준으로 중복 제거하면서 표시명 결정
  // 우선순위: r2(variant_name 직접 매칭) > r1(앨범 artist 직접 매칭) = r3(search alias 매칭)
  const displayMap = new Map<string, string>();

  // r1: 앨범 artist 직접 매칭 — alias 있으면 variant_name으로, 없으면 spotify_name 그대로
  for (const a of (r1.data ?? []) as { artist: string }[]) {
    displayMap.set(a.artist, aliasMap.get(a.artist.toLowerCase()) ?? a.artist);
  }

  // r2: variant_name alias 매칭 — 표시명이 곧 variant_name (r1 결과 있어도 덮어씀)
  for (const a of (r2.data ?? []) as { spotify_name: string; variant_name: string }[]) {
    displayMap.set(a.spotify_name, a.variant_name);
  }

  // r3: search alias 매칭 — alias map에서 variant_name 조회, 없으면 spotify_name
  for (const a of (r3.data ?? []) as { spotify_name: string }[]) {
    if (!displayMap.has(a.spotify_name)) {
      displayMap.set(a.spotify_name, aliasMap.get(a.spotify_name.toLowerCase()) ?? a.spotify_name);
    }
  }

  return NextResponse.json([...displayMap.values()].slice(0, 10));
}
