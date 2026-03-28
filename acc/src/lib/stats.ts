import { supabaseServer } from "@/lib/supabase";

export type AlbumStat = {
  id: string;
  title: string;
  artist: string;
  year: string | null;
  genre: string | null;
  cover_url: string | null;
  avg: number;
  count: number;
  variance?: number;
};

type RawAlbum = {
  id: string;
  title: string;
  artist: string;
  year?: string | null;
  genre?: string | null;
  cover_url?: string | null;
  ratings: { user_id: string; score: number }[];
};

export async function fetchAllAlbumsWithRatings(): Promise<RawAlbum[]> {
  const result: RawAlbum[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabaseServer
      .from("albums")
      .select("id, title, artist, year, genre, cover_url, ratings(user_id, score)")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    result.push(...(data as RawAlbum[]));
    if (data.length < 1000) break;
  }
  return result;
}

function toStat(album: RawAlbum): AlbumStat & { variance: number } {
  const scores = album.ratings.map((r) => r.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.length >= 2
      ? scores.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / scores.length
      : 0;
  return {
    id: album.id,
    title: album.title,
    artist: album.artist,
    year: album.year ? album.year.slice(0, 4) : null,
    genre: album.genre ?? null,
    cover_url: album.cover_url ?? null,
    avg,
    count: scores.length,
    variance,
  };
}

// 평점 2명 이상 필터
function validAlbums(albums: RawAlbum[]) {
  return albums.filter((a) => a.ratings.length >= 2).map(toStat);
}

// 연도별 베스트: 각 연도의 avg 기준 정렬 앨범 목록
export function getBestByYear(albums: RawAlbum[]): Map<string, AlbumStat[]> {
  const valid = validAlbums(albums).filter((a) => a.year);
  const map = new Map<string, AlbumStat[]>();
  for (const a of valid) {
    const y = a.year!.slice(0, 4); // 날짜 형식 방어
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(a);
  }
  for (const [, list] of map) list.sort((a, b) => b.avg - a.avg);
  return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

// 장르별 베스트
export function getBestByGenre(albums: RawAlbum[]): Map<string, AlbumStat[]> {
  const valid = validAlbums(albums).filter((a) => a.genre);
  const map = new Map<string, AlbumStat[]>();
  for (const a of valid) {
    const g = a.genre!;
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(a);
  }
  for (const [, list] of map) list.sort((a, b) => b.avg - a.avg);
  return new Map([...map.entries()].sort((a, b) => b[1][0].avg - a[1][0].avg));
}

// 테마: 8점 클럽
export function getEightClub(albums: RawAlbum[]): AlbumStat[] {
  return validAlbums(albums)
    .filter((a) => albums.find((r) => r.id === a.id)!.ratings.some((r) => r.score === 8))
    .sort((a, b) => b.avg - a.avg);
}

// 테마: 만장일치 명반 (4명 모두 평가 + avg >= 7)
export function getUnanimous(albums: RawAlbum[]): AlbumStat[] {
  return validAlbums(albums)
    .filter((a) => a.count >= 4 && a.avg >= 7)
    .sort((a, b) => b.avg - a.avg);
}

// 테마: 의견 충돌 (분산 높은 순)
export function getControversial(albums: RawAlbum[]): AlbumStat[] {
  return validAlbums(albums)
    .sort((a, b) => (b.variance ?? 0) - (a.variance ?? 0));
}

export const THEMES = [
  { id: "eight_club", name: "8점 클럽", emoji: "⭐", description: "누군가 8점을 준 앨범들" },
  { id: "unanimous", name: "만장일치 명반", emoji: "🤝", description: "전원 평가 + 평균 7점 이상" },
  { id: "controversial", name: "의견 충돌", emoji: "⚡", description: "멤버 간 점수 편차가 가장 큰 앨범들" },
] as const;
