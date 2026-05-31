import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

export type YearlyRecap = {
  year: number;
  total: number;
  avg: string;
  topGenre: string | null;
  topArtist: string | null;
  hofCount: number;
  firstAlbum: { title: string; artist: string; date: string } | null;
  lastAlbum: { title: string; artist: string; date: string } | null;
};

export function computeYearlyRecap(ratings: ProfileRatingRow[]): YearlyRecap[] {
  const byYear = new Map<number, ProfileRatingRow[]>();
  for (const r of ratings) {
    if (!r.albums) continue;
    const year = parseInt(r.updated_at.slice(0, 4), 10);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(r);
  }

  const allYears = [...byYear.keys()].sort((a, b) => a - b);
  const recentYears = allYears.slice(-3);

  return recentYears.map((year) => {
    const rows = byYear.get(year)!;
    const total = rows.length;
    const avgNum = rows.reduce((s, r) => s + r.score, 0) / total;
    const avg = avgNum.toFixed(2);

    // 장르 집계
    const genreCount = new Map<string, number>();
    for (const r of rows) {
      const g = r.albums?.genre ?? "Other";
      genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    }
    const topGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // 아티스트 집계
    const artistCount = new Map<string, number>();
    for (const r of rows) {
      const a = r.albums?.artist_display ?? r.albums?.artist ?? "기타";
      artistCount.set(a, (artistCount.get(a) ?? 0) + 1);
    }
    const topArtist = [...artistCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // 8점 앨범 수
    const hofCount = rows.filter((r) => r.score === 8).length;

    // 날짜순 정렬
    const sorted = [...rows].sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const firstAlbum = first?.albums
      ? { title: first.albums.title, artist: first.albums.artist_display ?? first.albums.artist, date: first.updated_at.slice(0, 10) }
      : null;
    const lastAlbum = last?.albums && last !== first
      ? { title: last.albums.title, artist: last.albums.artist_display ?? last.albums.artist, date: last.updated_at.slice(0, 10) }
      : null;

    return { year, total, avg, topGenre, topArtist, hofCount, firstAlbum, lastAlbum };
  });
}

export type ProfileRatingRow = {
  score: number;
  one_line_review: string | null;
  updated_at: string;
  created_at?: string;
  encounter_date?: string | null;
  albums: {
    id: string;
    title: string;
    artist: string;
    artist_display?: string;
    use_artist_variant?: boolean | null;
    extra_artists?: string | null;
    release_date: string | null;
    genre: string | null;
    cover_url: string | null;
    region: string | null;
  } | null;
};

const _fetchProfileRatings = unstable_cache(
  async (userId: string): Promise<ProfileRatingRow[]> => {
    const all: ProfileRatingRow[] = [];
    for (let page = 0; ; page++) {
      const { data } = await supabaseServer
        .from("ratings")
        .select("score, one_line_review, updated_at, created_at, encounter_date, albums(id, title, artist, use_artist_variant, extra_artists, release_date, genre, cover_url, region)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      all.push(...(data as unknown as ProfileRatingRow[]));
      if (data.length < 1000) break;
    }

    // artist_display 해상도 적용
    const albumObjects = all.map((r) => r.albums).filter((a): a is NonNullable<ProfileRatingRow["albums"]> => a != null);
    if (albumObjects.length > 0) {
      const resolved = await resolveArtistDisplay(albumObjects);
      const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display]));
      for (const row of all) {
        if (row.albums) {
          row.albums.artist_display = displayMap.get(row.albums.id) ?? row.albums.artist;
        }
      }
    }

    return all;
  },
  ["profile-ratings"],
  { tags: ["profile-ratings"], revalidate: 3600 }
);

export function fetchProfileRatings(userId: string) {
  return _fetchProfileRatings(userId);
}

// 모든 유저의 avatar_url — userId → url | null
export const fetchAllUserAvatarUrls = unstable_cache(
  async (): Promise<Record<string, string | null>> => {
    const { data } = await supabaseServer.from("users").select("id, avatar_url");
    const result: Record<string, string | null> = {};
    for (const row of (data ?? []) as { id: string; avatar_url: string | null }[]) {
      result[row.id] = row.avatar_url ?? null;
    }
    return result;
  },
  ["user-avatar-urls"],
  { tags: ["user-avatars"], revalidate: 3600 }
);

// 모든 유저의 top2 장르명 — userId → [genre1, genre2]
export const fetchAllUserGenreEmojis = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    const all: { user_id: string; albums: { genre: string | null } | null }[] = [];
    for (let page = 0; ; page++) {
      const { data } = await supabaseServer
        .from("ratings")
        .select("user_id, albums(genre)")
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      all.push(...(data as unknown as typeof all));
      if (data.length < 1000) break;
    }
    const byUser = new Map<string, Map<string, number>>();
    for (const r of all) {
      const g = r.albums?.genre ?? "Other";
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Map());
      const gm = byUser.get(r.user_id)!;
      gm.set(g, (gm.get(g) ?? 0) + 1);
    }
    const result: Record<string, string[]> = {};
    for (const [userId, gm] of byUser) {
      result[userId] = [...gm.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([g]) => g);
    }
    return result;
  },
  ["user-genre-emojis"],
  { tags: ["profile-ratings"], revalidate: 3600 }
);

export type AlbumStat = {
  id: string;
  title: string;
  artist: string;
  artist_display: string;
  year: string | null;
  release_date: string | null;
  genre: string | null;
  cover_url: string | null;
  spotify_id?: string | null;
  region?: string | null;
  avg: number;
  count: number;
  variance?: number;
};

type RawAlbum = {
  id: string;
  title: string;
  artist: string;
  artist_display?: string;
  use_artist_variant?: boolean | null;
  release_date?: string | null;
  genre?: string | null;
  cover_url?: string | null;
  spotify_id?: string | null;
  region?: string | null;
  ratings: { user_id: string; score: number }[];
};

async function _fetchAllAlbumsWithRatings(): Promise<RawAlbum[]> {
  const result: RawAlbum[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabaseServer
      .from("albums")
      .select("id, title, artist, use_artist_variant, release_date, genre, cover_url, spotify_id, soundcloud_url, region, ratings(user_id, score)")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    result.push(...(data as RawAlbum[]));
    if (data.length < 1000) break;
  }
  // artist_display 해상도 적용
  const resolved = await resolveArtistDisplay(result);
  return resolved;
}

// 1시간 캐시 — 앨범/평점이 추가되면 revalidateTag("all-albums-with-ratings")로 갱신
export const fetchAllAlbumsWithRatings = unstable_cache(
  _fetchAllAlbumsWithRatings,
  ["all-albums-with-ratings"],
  { tags: ["all-albums-with-ratings"], revalidate: 3600 }
);

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
    artist_display: album.artist_display ?? album.artist,
    year: album.release_date ? album.release_date.slice(0, 4) : null,
    release_date: album.release_date ?? null,
    genre: album.genre ?? null,
    cover_url: album.cover_url ?? null,
    spotify_id: album.spotify_id ?? null,
    region: album.region ?? null,
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

// 아티스트별: 2장 이상인 아티스트의 앨범 목록 (아티스트 평균 내림차순)
export function getBestByArtist(albums: RawAlbum[]): Map<string, AlbumStat[]> {
  const valid = validAlbums(albums);
  const map = new Map<string, AlbumStat[]>();
  for (const a of valid) {
    if (!map.has(a.artist)) map.set(a.artist, []);
    map.get(a.artist)!.push(a);
  }
  // 3장 미만 또는 Various Artists 제거, 각 아티스트 앨범 avg 내림차순
  for (const [artist, list] of map) {
    if (list.length < 3 || artist.toLowerCase().includes("various")) { map.delete(artist); continue; }
    list.sort((a, b) => b.avg - a.avg);
  }
  // 기본 정렬: 보유 앨범 수 내림차순
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length));
}

export type RegionSplit<T> = { all: T; domestic: T; foreign: T };

// 전체/국내/해외 필터를 한 번에 계산 — best/page.tsx에서 9번 중복 호출 방지
export function getBestDataForPage(albums: RawAlbum[]): {
  yearData: RegionSplit<[string, AlbumStat[]][]>;
  genreData: RegionSplit<[string, AlbumStat[]][]>;
  artistData: RegionSplit<[string, AlbumStat[]][]>;
  allRanked: AlbumStat[];
  domesticRanked: AlbumStat[];
  foreignRanked: AlbumStat[];
} {
  const dom = albums.filter((a) => a.region === "국내");
  const for_ = albums.filter((a) => a.region === "해외");
  return {
    yearData: {
      all: [...getBestByYear(albums).entries()],
      domestic: [...getBestByYear(dom).entries()],
      foreign: [...getBestByYear(for_).entries()],
    },
    genreData: {
      all: [...getBestByGenre(albums).entries()],
      domestic: [...getBestByGenre(dom).entries()],
      foreign: [...getBestByGenre(for_).entries()],
    },
    artistData: {
      all: [...getBestByArtist(albums).entries()],
      domestic: [...getBestByArtist(dom).entries()],
      foreign: [...getBestByArtist(for_).entries()],
    },
    allRanked: getRankedAll(albums),
    domesticRanked: getRankedAll(dom),
    foreignRanked: getRankedAll(for_),
  };
}

// 테마: 아티스트 대표작 (2장 이상 평가된 아티스트의 최고 앨범)
export function getArtistBest(albums: RawAlbum[]): AlbumStat[] {
  const valid = validAlbums(albums);
  const artistMap = new Map<string, AlbumStat>();
  const artistCount = new Map<string, number>();

  for (const a of valid) {
    artistCount.set(a.artist, (artistCount.get(a.artist) ?? 0) + 1);
  }

  for (const a of valid) {
    if ((artistCount.get(a.artist) ?? 0) < 2) continue;
    const prev = artistMap.get(a.artist);
    if (!prev || a.avg > prev.avg) artistMap.set(a.artist, a);
  }

  return [...artistMap.values()].sort((a, b) => b.avg - a.avg);
}

// 통합 랭킹: 베이즈 평균 내림차순 상위 50개 (평점 2명 이상)
// B = (C * globalAvg + sum_scores) / (C + count) — 1명만 8점인 앨범이 5명 전원 7.5점 앨범을 앞서는 문제 해결
export function getRankedAll(albums: RawAlbum[]): AlbumStat[] {
  const valid = validAlbums(albums);
  if (!valid.length) return [];
  const globalAvg = valid.reduce((s, a) => s + a.avg, 0) / valid.length;
  const C = 2;
  return valid
    .sort((a, b) => {
      const bA = (C * globalAvg + a.avg * a.count) / (C + a.count);
      const bB = (C * globalAvg + b.avg * b.count) / (C + b.count);
      return bB - bA;
    })
    .slice(0, 50);
}

// 미발견 명반: 평점 1~2명이지만 최고 점수 >= 7인 앨범 (발굴 대기 중)
export function getHiddenGems(albums: RawAlbum[]): AlbumStat[] {
  return albums
    .filter((a) => {
      const scores = a.ratings.map((r) => r.score);
      return scores.length >= 1 && scores.length <= 2 && Math.max(...scores) >= 7;
    })
    .map(toStat)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);
}

// 청음인 페이지용 — 전체 ratings (1시간 캐시)
export type MemberRatingRow = {
  user_id: string;
  album_id: string;
  score: number;
  one_line_review: string | null;
  albums: { id: string; genre: string | null; artist: string | null } | null;
};

export const fetchAllMemberRatings = unstable_cache(
  async (): Promise<MemberRatingRow[]> => {
    const all: MemberRatingRow[] = [];
    for (let page = 0; ; page++) {
      const { data } = await supabaseServer
        .from("ratings")
        .select("user_id, album_id, score, one_line_review, albums(id, genre, artist)")
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!data || data.length === 0) break;
      all.push(...(data as unknown as MemberRatingRow[]));
      if (data.length < 1000) break;
    }
    return all;
  },
  ["all-member-ratings"],
  { tags: ["profile-ratings"], revalidate: 3600 }
);

// 서버사이드: DB에서 전체 유저 목록 조회
export const fetchAllUsers = unstable_cache(
  async (): Promise<Array<{ id: string; display_name: string; emoji: string }>> => {
    const { data } = await supabaseServer
      .from("users")
      .select("id, display_name, emoji")
      .order("id");
    return data ?? [];
  },
  ["all-users"],
  { tags: ["all-users"], revalidate: 300 }
);
