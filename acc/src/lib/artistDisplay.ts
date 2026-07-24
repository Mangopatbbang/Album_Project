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
  { tags: ["artist-aliases"], revalidate: false }
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

// PostgREST .or() 값에서 백슬래시·따옴표를 이스케이프해 쌍따옴표로 감싸기
// 콤마·괄호 등 OR 파서 특수문자를 리터럴로 보존
function quoteOrVal(v: string) {
  return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/**
 * 검색어(한글 포함)를 받아 alias 테이블과 검색 alias 테이블을 동시 참조해
 * 일치하는 spotify_name 목록을 반환 (two-step 검색용) — 60s 캐시
 *
 * Plan A: 공백 변형을 .or() 하나로 통합 → 10쿼리 → 2쿼리
 * Plan D: 1글자 이하 검색어는 alias 조회 스킵 (광범위 쿼리 방지)
 */
export const findArtistsByVariant = unstable_cache(
  async (search: string): Promise<string[]> => {
    if (search.trim().length < 2) return [];
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

    // 모든 이스케이프된 패턴을 하나의 배열로 통합
    const allEscaped = [
      esc,
      ...spaceVariants.map(v => v.replace(/%/g, "\\%").replace(/_/g, "\\_")),
    ];
    // .or() 조건 문자열 생성: 각 패턴을 quoteOrVal로 감싸 파서 안전성 보장
    const buildOr = (col: string) =>
      allEscaped.map(p => `${col}.ilike.${quoteOrVal(`%${p}%`)}`).join(",");

    // 10개 별도 쿼리 → 2개 .or() 쿼리로 통합
    const [{ data: aliasData }, { data: searchAliasData }] = await Promise.all([
      supabaseServer.from("artist_aliases").select("spotify_name").or(buildOr("variant_name")),
      supabaseServer.from("artist_search_aliases").select("spotify_name").or(buildOr("alias")),
    ]);

    const names = new Set<string>();
    for (const a of (aliasData ?? []) as { spotify_name: string }[]) names.add(a.spotify_name);
    for (const a of (searchAliasData ?? []) as { spotify_name: string }[]) names.add(a.spotify_name);
    return [...names];
  },
  ["find-artists-by-variant"],
  { revalidate: 60 }
);
