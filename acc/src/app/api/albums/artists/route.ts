import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { fetchAliasMap } from "@/lib/artistDisplay";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  // SQL LIKE 와일드카드 이스케이프 (% → \%, _ → \_)
  const esc = q.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // 공백 정규화 변형: 공백 없으면 삽입, 공백 있으면 제거
  const spaceVariants: string[] = [];
  if (!q.includes(' ') && q.length > 1) {
    for (let i = 1; i < q.length; i++) {
      spaceVariants.push(q.slice(0, i) + ' ' + q.slice(i));
    }
  } else if (q.includes(' ')) {
    spaceVariants.push(q.replace(/\s+/g, ''));
  }

  const [mainRes, spaceResults] = await Promise.all([
    Promise.all([
      supabaseServer.from("albums").select("artist").ilike("artist", `%${esc}%`).limit(60),
      supabaseServer.from("artist_aliases").select("spotify_name, variant_name").ilike("variant_name", `%${esc}%`).limit(20),
      supabaseServer.from("artist_search_aliases").select("spotify_name").ilike("alias", `%${esc}%`).limit(20),
      fetchAliasMap(),
    ]),
    Promise.all(spaceVariants.map(v => {
      const ev = v.replace(/%/g, "\\%").replace(/_/g, "\\_");
      return supabaseServer.from("albums").select("artist").ilike("artist", `%${ev}%`).limit(20);
    })),
  ]);

  const [r1, r2, r3, aliasMap] = mainRes;

  // Map<spotify_name, display_name> — 우선순위: r2(variant_name 직접 매칭) > r1 = r3 = spaceResults
  const displayMap = new Map<string, string>();

  for (const a of (r1.data ?? []) as { artist: string }[]) {
    displayMap.set(a.artist, aliasMap.get(a.artist.toLowerCase()) ?? a.artist);
  }
  for (const a of (r2.data ?? []) as { spotify_name: string; variant_name: string }[]) {
    displayMap.set(a.spotify_name, a.variant_name);
  }
  for (const a of (r3.data ?? []) as { spotify_name: string }[]) {
    if (!displayMap.has(a.spotify_name)) {
      displayMap.set(a.spotify_name, aliasMap.get(a.spotify_name.toLowerCase()) ?? a.spotify_name);
    }
  }
  for (const r of spaceResults) {
    for (const a of (r.data ?? []) as { artist: string }[]) {
      if (!displayMap.has(a.artist)) {
        displayMap.set(a.artist, aliasMap.get(a.artist.toLowerCase()) ?? a.artist);
      }
    }
  }

  return NextResponse.json([...displayMap.values()].slice(0, 10));
}
