import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay, findArtistsByVariant } from "@/lib/artistDisplay";

const LIMIT = 30;
const SELECT = "id, title, artist, use_artist_variant, year, release_date, genre, cover_url, spotify_id, ratings(user_id, score)";

// PostgREST .or() 쿼리 안에서 파서를 깨는 특수문자 제거
function escapeSearch(s: string) {
  return s.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}

// 검색어 + alias 매칭된 spotify_names 로 OR 조건 문자열 생성
function buildSearchOr(s: string, aliasMatches: string[]): string {
  const parts = [`title.ilike.%${s}%`, `artist.ilike.%${s}%`, `extra_artists.ilike.%${s}%`];
  for (const a of aliasMatches) {
    const safe = escapeSearch(a);
    if (safe) parts.push(`artist.ilike.${safe}`);  // % 없이 exact match (대소문자 무시)
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

  // 검색어가 있으면 alias two-step 미리 처리
  const aliasMatches = search ? await findArtistsByVariant(search) : [];
  const safeSearch = search ? escapeSearch(search) : null;

  if (sort === "avg_desc" || sort === "avg_asc") {
    return handleAvgSort({ limit, offset, search: safeSearch, aliasMatches, genre, sort, userId, unrated });
  }
  if ((sort === "my_desc" || sort === "my_asc") && userId) {
    return handleMySort({ limit, offset, search: safeSearch, aliasMatches, genre, sort, userId });
  }

  // 특정 점수 필터
  if (myScore && userId) {
    const { data: scored, error: scoreErr } = await supabaseServer
      .from("ratings").select("album_id").eq("user_id", userId).eq("score", myScore);
    if (scoreErr) return NextResponse.json({ error: scoreErr.message }, { status: 500 });
    const scoreIds = (scored ?? []).map((r) => r.album_id);
    if (scoreIds.length === 0) return NextResponse.json({ items: [], nextOffset: null, hasMore: false });

    let q = supabaseServer.from("albums").select(SELECT).in("id", scoreIds);
    if (safeSearch) q = q.or(buildSearchOr(safeSearch, aliasMatches));
    if (genre) q = q.eq("genre", genre);
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
  if (safeSearch) query = query.or(buildSearchOr(safeSearch, aliasMatches));
  if (genre) query = query.eq("genre", genre);
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
  limit: number; offset: number; search?: string | null;
  aliasMatches: string[]; genre?: string; sort: string; userId: string;
}) {
  const { limit, offset, search, aliasMatches, genre, sort, userId } = params;
  const { data: myRatings } = await supabaseServer.from("ratings").select("album_id, score").eq("user_id", userId);
  const myScoreMap = new Map((myRatings ?? []).map((r) => [r.album_id, r.score]));

  let albumQuery = supabaseServer.from("albums").select("id");
  if (search) albumQuery = albumQuery.or(buildSearchOr(search, aliasMatches));
  if (genre) albumQuery = albumQuery.eq("genre", genre);
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
  limit: number; offset: number; search?: string | null;
  aliasMatches: string[]; genre?: string; sort: string; userId?: string; unrated?: boolean;
}) {
  const { limit, offset, search, aliasMatches, genre, sort, userId, unrated } = params;
  let excludeIds: string[] = [];
  if (unrated && userId) {
    const { data: rated } = await supabaseServer.from("ratings").select("album_id").eq("user_id", userId);
    excludeIds = (rated ?? []).map((r) => r.album_id);
  }

  const ratingData: { album_id: string; score: number }[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabaseServer.from("ratings").select("album_id, score").range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    ratingData.push(...data);
    if (data.length < 1000) break;
  }

  const totalMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  for (const r of ratingData) {
    totalMap.set(r.album_id, (totalMap.get(r.album_id) ?? 0) + r.score);
    countMap.set(r.album_id, (countMap.get(r.album_id) ?? 0) + 1);
  }

  let albumQuery = supabaseServer.from("albums").select("id");
  if (search) albumQuery = albumQuery.or(buildSearchOr(search, aliasMatches));
  if (genre) albumQuery = albumQuery.eq("genre", genre);
  if (excludeIds.length > 0) albumQuery = albumQuery.not("id", "in", `(${excludeIds.join(",")})`);
  const { data: allAlbums } = await albumQuery;

  const sorted = (allAlbums ?? [])
    .map((a) => {
      const total = totalMap.get(a.id); const count = countMap.get(a.id) ?? 0;
      return { id: a.id, avg: total != null && count > 0 ? total / count : null };
    })
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
  const body = await req.json();
  const { title, artist, extra_artists, year, release_date, genre, cover_url, tracklist, spotify_id, added_by } = body;
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
    .insert({ id: newId, title: title.trim(), artist: artist.trim(), extra_artists: extra_artists || null, year, release_date, genre, cover_url, tracklist, spotify_id: spotify_id || null, added_by: added_by || null })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/best");
  return NextResponse.json(data, { status: 201 });
}

function mapAlbum(album: {
  id: string; title: string; artist: string; artist_display?: string;
  use_artist_variant?: boolean | null;
  year?: string | null; release_date?: string | null;
  genre?: string | null; cover_url?: string | null; spotify_id?: string | null;
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
    ratings, avg,
  };
}
