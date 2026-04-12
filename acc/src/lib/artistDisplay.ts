import { supabaseServer } from "@/lib/supabase";

/** artist_aliases 테이블 전체를 Map으로 반환 (spotify_name → variant_name) */
export async function fetchAliasMap(): Promise<Map<string, string>> {
  const { data } = await supabaseServer
    .from("artist_aliases")
    .select("spotify_name, variant_name");
  return new Map((data ?? []).map((r: { spotify_name: string; variant_name: string }) => [r.spotify_name, r.variant_name]));
}

type HasArtist = {
  artist: string;
  use_artist_variant?: boolean | null;
};

/** 앨범 배열에 artist_display 필드를 추가해 반환 */
export function applyArtistDisplay<T extends HasArtist>(
  albums: T[],
  aliasMap: Map<string, string>
): (T & { artist_display: string })[] {
  return albums.map((a) => ({
    ...a,
    artist_display:
      a.use_artist_variant && aliasMap.get(a.artist)
        ? aliasMap.get(a.artist)!
        : a.artist,
  }));
}

/** 앨범 배열에 대해 alias DB 조회 + artist_display 적용을 한 번에 처리 */
export async function resolveArtistDisplay<T extends HasArtist>(
  albums: T[]
): Promise<(T & { artist_display: string })[]> {
  if (albums.length === 0) return [];
  const names = [...new Set(albums.map((a) => a.artist))];
  const { data } = await supabaseServer
    .from("artist_aliases")
    .select("spotify_name, variant_name")
    .in("spotify_name", names);
  const map = new Map(
    (data ?? []).map((r: { spotify_name: string; variant_name: string }) => [r.spotify_name, r.variant_name])
  );
  return applyArtistDisplay(albums, map);
}

/**
 * 검색어(한글 포함)를 받아 alias 테이블을 참조해
 * 일치하는 spotify_name 목록을 반환 (two-step 검색용)
 */
export async function findArtistsByVariant(search: string): Promise<string[]> {
  if (!search.trim()) return [];
  const { data } = await supabaseServer
    .from("artist_aliases")
    .select("spotify_name")
    .ilike("variant_name", `%${search}%`);
  return (data ?? []).map((r: { spotify_name: string }) => r.spotify_name);
}
