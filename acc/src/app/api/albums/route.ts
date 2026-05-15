import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay, findArtistsByVariant } from "@/lib/artistDisplay";
import { logActivity } from "@/lib/activityLog";
import { validateUser } from "@/lib/validateUser";
import { getRawGenreValues } from "@/lib/bio";
import { fetchAllAlbumsWithRatings } from "@/lib/stats";

const LIMIT = 30;
const SELECT = "id, title, artist, use_artist_variant, extra_artists, year, release_date, genre, cover_url, spotify_id, soundcloud_url, created_at, ratings(user_id, score)";

// PostgREST .or() 쿼리 안에서 파서를 깨는 특수문자 제거 + SQL LIKE 와일드카드 이스케이프
function escapeSearch(s: string) {
  return s
    .replace(/[(),"{}[\]]/g, " ")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\s+/g, " ")
    .trim();
}

// PostgREST OR 파서에서 콤마·괄호를 값으로 보존하기 위해 큰따옴표로 감싸기
function quoteOrValue(val: string) {
  return '"' + val.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

// 검색어 + alias 매칭된 spotify_names 로 OR 조건 문자열 생성
// rawSearch: 원본 검색어 (이스케이프 전), 콤마 포함 아티스트명 직접 검색 지원
function buildSearchOr(s: string, aliasMatches: string[], rawSearch?: string): string {
  // extra_artists는 "A;B;C" 세미콜론 구분 — 토큰 단위 정확 매칭 4패턴
  const extraParts = [
    `extra_artists.ilike.${s}`,
    `extra_artists.ilike.${s};%`,
    `extra_artists.ilike.%;${s};%`,
    `extra_artists.ilike.%;${s}`,
  ];
  const parts = [`title.ilike.%${s}%`, `artist.ilike.%${s}%`, ...extraParts];

  // 원본 검색어에 특수문자가 있으면 따옴표로 감싼 패턴도 추가
  // rawSearch 안의 % _ 는 quoteOrValue 전에 이스케이프 (SQL 와일드카드 방지)
  if (rawSearch && rawSearch !== s) {
    const r = rawSearch.replace(/%/g, "\\%").replace(/_/g, "\\_");
    parts.push(
      `title.ilike.${quoteOrValue(`%${r}%`)}`,
      `artist.ilike.${quoteOrValue(`%${r}%`)}`,
      `extra_artists.ilike.${quoteOrValue(r)}`,
      `extra_artists.ilike.${quoteOrValue(`${r};%`)}`,
      `extra_artists.ilike.${quoteOrValue(`%;${r};%`)}`,
      `extra_artists.ilike.${quoteOrValue(`%;${r}`)}`,
    );
  }

  // alias 매칭된 spotify_name — 콤마 포함 이름도 따옴표 처리로 보존
  // % _ 이스케이프로 spotify_name 안의 와일드카드 방지
  for (const a of aliasMatches) {
    const ea = a.replace(/%/g, "\\%").replace(/_/g, "\\_");
    parts.push(
      `artist.ilike.${quoteOrValue(ea)}`,
      `extra_artists.ilike.${quoteOrValue(ea)}`,
      `extra_artists.ilike.${quoteOrValue(`${ea};%`)}`,
      `extra_artists.ilike.${quoteOrValue(`%;${ea};%`)}`,
      `extra_artists.ilike.${quoteOrValue(`%;${ea}`)}`,
    );
  }

  // 공백 정규화: 공백 없는 검색어 → 한 칸씩 공백 삽입 시도 (에픽하이 → 에픽 하이)
  //             공백 있는 검색어 → 공백 제거 버전 추가 (에픽 하이 → 에픽하이)
  if (rawSearch) {
    if (!rawSearch.includes(' ') && rawSearch.length > 1) {
      for (let i = 1; i < rawSearch.length; i++) {
        const sp = rawSearch.slice(0, i) + ' ' + rawSearch.slice(i);
        const r = sp.replace(/%/g, "\\%").replace(/_/g, "\\_");
        parts.push(
          `title.ilike.${quoteOrValue(`%${r}%`)}`,
          `artist.ilike.${quoteOrValue(`%${r}%`)}`,
        );
      }
    } else if (rawSearch.includes(' ')) {
      const noSp = rawSearch.replace(/\s+/g, '').replace(/%/g, "\\%").replace(/_/g, "\\_");
      if (noSp.length > 1) {
        parts.push(
          `title.ilike.${quoteOrValue(`%${noSp}%`)}`,
          `artist.ilike.${quoteOrValue(`%${noSp}%`)}`,
        );
      }
    }
  }

  return parts.join(",");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const limit = Math.min(Number(searchParams.get("limit") ?? LIMIT), 100);
  const offset = Number(searchParams.get("offset") ?? 0);
  const search = searchParams.get("search")?.trim();
  const genre = searchParams.get("genre")?.trim();
  const sort = searchParams.get("sort") ?? "newest";
  const userId = searchParams.get("userId")?.trim();
  const unrated = searchParams.get("unrated") === "true";
  const myScore = searchParams.get("myScore") ? Number(searchParams.get("myScore")) : null;
  const regionFilter = searchParams.get("region")?.trim() || null;

  // 검색어가 있으면 alias two-step 미리 처리
  const aliasMatches = search ? await findArtistsByVariant(search) : [];
  const safeSearch = search ? escapeSearch(search) : null;

  if (sort === "avg_desc" || sort === "avg_asc") {
    return handleAvgSort({ limit, offset, search: safeSearch, rawSearch: search ?? null, aliasMatches, genre, sort, userId, unrated, region: regionFilter });
  }
  if ((sort === "my_desc" || sort === "my_asc") && userId) {
    return handleMySort({ limit, offset, search: safeSearch, rawSearch: search ?? null, aliasMatches, genre, sort, userId, region: regionFilter });
  }

  // 특정 점수 필터
  if (myScore && userId) {
    const { data: scored, error: scoreErr } = await supabaseServer
      .from("ratings").select("album_id").eq("user_id", userId).eq("score", myScore);
    if (scoreErr) return NextResponse.json({ error: scoreErr.message }, { status: 500 });
    const scoreIds = (scored ?? []).map((r) => r.album_id);
    if (scoreIds.length === 0) return NextResponse.json({ items: [], nextOffset: null, hasMore: false });

    let q = supabaseServer.from("albums").select(SELECT).in("id", scoreIds);
    if (safeSearch) q = q.or(buildSearchOr(safeSearch, aliasMatches, search ?? undefined));
    if (genre) { const raws = getRawGenreValues(genre); q = raws.length === 1 ? q.eq("genre", raws[0]) : q.in("genre", raws); }
    if (regionFilter) q = q.eq("region", regionFilter);
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const resolved = await resolveArtistDisplay(data ?? []);
    return NextResponse.json({ items: resolved.map(mapAlbum), nextOffset: null, hasMore: false });
  }

  // 미평가 앨범
  let excludeIds: string[] = [];
  if (unrated && userId) {
    const { data: rated } = await supabaseServer.from("ratings").select("album_id").eq("user_id", userId);
    excludeIds = (rated ?? []).map((r) => r.album_id);
  }

  let query = supabaseServer.from("albums").select(SELECT).range(offset, offset + limit);
  if (safeSearch) query = query.or(buildSearchOr(safeSearch, aliasMatches, search ?? undefined));
  if (genre) { const raws = getRawGenreValues(genre); query = raws.length === 1 ? query.eq("genre", raws[0]) : query.in("genre", raws); }
  if (regionFilter) query = query.eq("region", regionFilter);
  if (excludeIds.length > 0) query = query.not("id", "in", `(${excludeIds.join(",")})`);

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true }).order("id", { ascending: true });
  } else if (sort === "title") {
    query = query.order("title", { ascending: true }).order("id", { ascending: true });
  } else if (sort === "release_desc") {
    query = query.order("release_date", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
  } else if (sort === "release_asc") {
    query = query.order("release_date", { ascending: true, nullsFirst: false }).order("id", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = data ?? [];
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const resolved = await resolveArtistDisplay(page);

  return NextResponse.json({
    items: resolved.map(mapAlbum),
    nextOffset: hasMore ? offset + limit : null,
    hasMore,
  });
}

async function handleMySort(params: {
  limit: number; offset: number; search?: string | null; rawSearch?: string | null;
  aliasMatches: string[]; genre?: string; sort: string; userId: string; region?: string | null;
}) {
  const { limit, offset, search, rawSearch, aliasMatches, genre, sort, userId, region } = params;
  const { data: myRatings } = await supabaseServer.from("ratings").select("album_id, score").eq("user_id", userId);
  const myScoreMap = new Map((myRatings ?? []).map((r) => [r.album_id, r.score]));

  let albumQuery = supabaseServer.from("albums").select("id");
  if (search) albumQuery = albumQuery.or(buildSearchOr(search, aliasMatches, rawSearch ?? undefined));
  if (genre) { const raws = getRawGenreValues(genre); albumQuery = raws.length === 1 ? albumQuery.eq("genre", raws[0]) : albumQuery.in("genre", raws); }
  if (region) albumQuery = albumQuery.eq("region", region);
  const { data: allAlbums } = await albumQuery;

  const sorted = (allAlbums ?? [])
    .filter((a) => myScoreMap.has(a.id))
    .map((a) => ({ id: a.id, score: myScoreMap.get(a.id)! }))
    .sort((a, b) => sort === "my_desc" ? b.score - a.score : a.score - b.score);

  const pageItems = sorted.slice(offset, offset + limit + 1);
  const hasMore = pageItems.length > limit;
  const pageIds = pageItems.slice(0, limit).map((a) => a.id);
  if (pageIds.length === 0) return NextResponse.json({ items: [], nextOffset: null, hasMore: false });

  const { data, error } = await supabaseServer.from("albums").select(SELECT).in("id", pageIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const orderMap = new Map(pageIds.map((id, i) => [id, i]));
  const reordered = (data ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  const resolved = await resolveArtistDisplay(reordered);
  return NextResponse.json({ items: resolved.map(mapAlbum), nextOffset: hasMore ? offset + limit : null, hasMore });
}

async function handleAvgSort(params: {
  limit: number; offset: number; search?: string | null; rawSearch?: string | null;
  aliasMatches: string[]; genre?: string; sort: string; userId?: string; unrated?: boolean; region?: string | null;
}) {
  const { limit, offset, search, rawSearch, aliasMatches, genre, sort, userId, unrated, region } = params;

  // 캐시된 전체 앨범+평점 데이터에서 평균 맵 구성 (DB 풀스캔 대신 캐시 재활용)
  const cachedAlbums = await fetchAllAlbumsWithRatings();
  const avgMap = new Map<string, number | null>(
    cachedAlbums.map((a) => {
      const scores = a.ratings.map((r) => r.score);
      return [a.id, scores.length > 0 ? scores.reduce((s, n) => s + n, 0) / scores.length : null];
    })
  );

  let excludeIds: string[] = [];
  if (unrated && userId) {
    const { data: rated } = await supabaseServer.from("ratings").select("album_id").eq("user_id", userId);
    excludeIds = (rated ?? []).map((r) => r.album_id);
  }

  let albumQuery = supabaseServer.from("albums").select("id");
  if (search) albumQuery = albumQuery.or(buildSearchOr(search, aliasMatches, rawSearch ?? undefined));
  if (genre) { const raws = getRawGenreValues(genre); albumQuery = raws.length === 1 ? albumQuery.eq("genre", raws[0]) : albumQuery.in("genre", raws); }
  if (region) albumQuery = albumQuery.eq("region", region);
  if (excludeIds.length > 0) albumQuery = albumQuery.not("id", "in", `(${excludeIds.join(",")})`);
  const { data: filteredAlbums } = await albumQuery;

  const sorted = (filteredAlbums ?? [])
    .map((a) => ({ id: a.id, avg: avgMap.get(a.id) ?? null }))
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1; if (b.avg === null) return -1;
      return sort === "avg_desc" ? b.avg - a.avg : a.avg - b.avg;
    });

  const pageItems = sorted.slice(offset, offset + limit + 1);
  const hasMore = pageItems.length > limit;
  const pageIds = pageItems.slice(0, limit).map((a) => a.id);
  if (pageIds.length === 0) return NextResponse.json({ items: [], nextOffset: null, hasMore: false });

  const { data, error } = await supabaseServer.from("albums").select(SELECT).in("id", pageIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const orderMap = new Map(pageIds.map((id, i) => [id, i]));
  const reordered = (data ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  const resolved = await resolveArtistDisplay(reordered);
  return NextResponse.json({ items: resolved.map(mapAlbum), nextOffset: hasMore ? offset + limit : null, hasMore });
}

export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { title, artist, extra_artists, year, release_date, genre, region, cover_url, tracklist, spotify_id, soundcloud_url } = body;
  const added_by = authed.id;
  if (!title?.trim() || !artist?.trim()) return NextResponse.json({ error: "title and artist required" }, { status: 400 });
  if (tracklist) {
    const trackCount = tracklist.split(";").map((t: string) => t.trim()).filter(Boolean).length;
    if (trackCount <= 2) return NextResponse.json({ error: "싱글 앨범은 등록할 수 없습니다. (수록곡 3개 이상)" }, { status: 400 });
  }
  if (spotify_id) {
    const { data: bySpotify } = await supabaseServer.from("albums").select("id, title, artist").eq("spotify_id", spotify_id).limit(1).single();
    if (bySpotify) return NextResponse.json({ error: `이미 등록된 음반입니다 (${bySpotify.artist} - ${bySpotify.title})`, duplicate: true, id: bySpotify.id }, { status: 409 });
  }
  const { data: existing } = await supabaseServer.from("albums").select("id, title, artist").ilike("title", title.trim()).ilike("artist", artist.trim()).limit(1).single();
  if (existing) return NextResponse.json({ error: `이미 등록된 음반입니다 (${existing.artist} - ${existing.title})`, duplicate: true, id: existing.id }, { status: 409 });

  const newId = crypto.randomUUID();
  const { data, error } = await supabaseServer
    .from("albums")
    .insert({ id: newId, title: title.trim(), artist: artist.trim(), extra_artists: extra_artists || null, year, release_date, genre, region: region || null, cover_url, tracklist, spotify_id: spotify_id || null, soundcloud_url: soundcloud_url || null, added_by: added_by || null })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: artistAlbumCount } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .ilike("artist", artist.trim())
    .neq("id", data.id);
  const isNewArtist = (artistAlbumCount ?? 0) === 0;

  const missingFields: string[] = [];
  if (!cover_url) missingFields.push("커버");
  if (!genre) missingFields.push("장르");
  if (!region) missingFields.push("지역");
  if (!release_date) missingFields.push("발매일");
  if (!tracklist) missingFields.push("트랙리스트");

  const logDetails: Record<string, unknown> = {};
  if (isNewArtist) logDetails.new_artist = true;
  if (missingFields.length > 0) logDetails.missing = missingFields;

  await logActivity({
    userId: added_by ?? null, action: "album_add",
    albumId: data.id, albumTitle: data.title, albumArtist: data.artist,
    details: Object.keys(logDetails).length > 0 ? logDetails : undefined,
  });
  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings");
  revalidateTag("albums-page-meta");
  return NextResponse.json(data, { status: 201 });
}

function mapAlbum(album: {
  id: string; title: string; artist: string; artist_display?: string;
  use_artist_variant?: boolean | null;
  year?: string | null; release_date?: string | null;
  genre?: string | null; cover_url?: string | null; spotify_id?: string | null;
  created_at?: string | null;
  ratings?: { user_id: string; score: number }[];
}) {
  const ratings = (album.ratings ?? []) as { user_id: string; score: number }[];
  const scores = ratings.map((r) => r.score).filter((s) => typeof s === "number");
  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  return {
    id: album.id, title: album.title,
    artist: album.artist,
    artist_display: album.artist_display ?? album.artist,
    use_artist_variant: album.use_artist_variant ?? false,
    year: album.year, release_date: album.release_date ?? null,
    genre: album.genre, cover_url: album.cover_url, spotify_id: album.spotify_id,
    created_at: album.created_at ?? null,
    ratings, avg,
  };
}
