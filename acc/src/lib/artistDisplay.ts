import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";

// artist_aliases 전체를 직렬화 가능한 배열로 캐시 (unstable_cache는 JSON만 허용)
const _fetchAliasEntries = unstable_cache(
  async (): Promise<[string, string][]> => {
    const { data } = await supabaseServer
      .from("artist_aliases")
      .select("spotify_name, variant_name");
    return (data ?? []).map((r: { spotify_name: string; variant_name: string }) => [r.spotify_name, r.variant_name] as [string, string]);
  },
  ["artist-aliases"],
  { tags: ["artist-aliases"], revalidate: 86400 }
);

/** artist_aliases 테이블 전체를 Map으로 반환 (캐시됨, 키는 소문자 정규화) */
export async function fetchAliasMap(): Promise<Map<string, string>> {
  const entries = await _fetchAliasEntries();
  return new Map(entries.map(([k, v]) => [k.toLowerCase(), v]));
}

type HasArtist = {
  artist: string;
  use_artist_variant?: boolean | null;
  extra_artists?: string | null;
};

/** 앨범 배열에 artist_display 필드를 추가해 반환 */
export function applyArtistDisplay<T extends HasArtist>(
  albums: T[],
  aliasMap: Map<string, string>
): (T & { artist_display: string })[] {
  return albums.map((a) => {
    if (a.use_artist_variant) {
      const alias = aliasMap.get(a.artist.toLowerCase());
      if (alias) return { ...a, artist_display: alias };
      // alias 없고 extra_artists 있으면 개별 이름으로 분리 표시
      if (a.extra_artists) {
        const individuals = a.extra_artists.split(";").map((s) => s.trim()).filter(Boolean).join(", ");
        if (individuals) return { ...a, artist_display: individuals };
      }
    }
    return { ...a, artist_display: a.artist };
  });
}

/** 앨범 배열에 대해 alias 조회(캐시) + artist_display 적용을 한 번에 처리 */
export async function resolveArtistDisplay<T extends HasArtist>(
  albums: T[]
): Promise<(T & { artist_display: string })[]> {
  if (albums.length === 0) return [];
  const map = await fetchAliasMap();
  return applyArtistDisplay(albums, map);
}

/**
 * 검색어(한글 포함)를 받아 alias 테이블과 검색 alias 테이블을 동시 참조해
 * 일치하는 spotify_name 목록을 반환 (two-step 검색용)
 */
export async function findArtistsByVariant(search: string): Promise<string[]> {
  if (!search.trim()) return [];
  const esc = search.replace(/%/g, "\\%").replace(/_/g, "\\_");

  // 공백 정규화 변형: 공백 없으면 삽입, 공백 있으면 제거 (에픽하이 ↔ 에픽 하이)
  const spaceVariants: string[] = [];
  if (!search.includes(' ') && search.length > 1) {
    for (let i = 1; i < search.length; i++) {
      spaceVariants.push(search.slice(0, i) + ' ' + search.slice(i));
    }
  } else if (search.includes(' ')) {
    spaceVariants.push(search.replace(/\s+/g, ''));
  }

  const queries = [
    supabaseServer.from("artist_aliases").select("spotify_name").ilike("variant_name", `%${esc}%`),
    supabaseServer.from("artist_search_aliases").select("spotify_name").ilike("alias", `%${esc}%`),
    ...spaceVariants.map(v => {
      const ev = v.replace(/%/g, "\\%").replace(/_/g, "\\_");
      return supabaseServer.from("artist_aliases").select("spotify_name").ilike("variant_name", `%${ev}%`);
    }),
    ...spaceVariants.map(v => {
      const ev = v.replace(/%/g, "\\%").replace(/_/g, "\\_");
      return supabaseServer.from("artist_search_aliases").select("spotify_name").ilike("alias", `%${ev}%`);
    }),
  ];

  const results = await Promise.all(queries);
  const names = new Set<string>();
  for (const r of results) {
    for (const a of (r.data ?? []) as { spotify_name: string }[]) {
      names.add(a.spotify_name);
    }
  }
  return [...names];
}
