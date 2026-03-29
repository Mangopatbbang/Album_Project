import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const LIMIT = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const limit = Math.min(Number(searchParams.get("limit") ?? LIMIT), 100);
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search")?.trim();
  const genre = searchParams.get("genre")?.trim();
  const sort = searchParams.get("sort") ?? "newest";
  const userId = searchParams.get("userId")?.trim();
  const unrated = searchParams.get("unrated") === "true";
  const myScore = searchParams.get("myScore") ? Number(searchParams.get("myScore")) : null;

  // avg 정렬
  if (sort === "avg_desc" || sort === "avg_asc") {
    return handleAvgSort({ limit, cursor, search, genre, sort, userId, unrated });
  }

  // 내 평점 기준 정렬
  if ((sort === "my_desc" || sort === "my_asc") && userId) {
    return handleMySort({ limit, cursor, search, genre, sort, userId, unrated });
  }

  // 특정 점수 필터: 내가 해당 점수를 준 앨범만
  if (myScore && userId) {
    const scoredAll: { album_id: string }[] = [];
    for (let page = 0; ; page++) {
      const { data: scored } = await supabaseServer
        .from("ratings")
        .select("album_id")
        .eq("user_id", userId)
        .eq("score", myScore)
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!scored || scored.length === 0) break;
      scoredAll.push(...scored);
      if (scored.length < 1000) break;
    }
    const scoreIds = scoredAll.map((r) => r.album_id);
    if (scoreIds.length === 0) return NextResponse.json({ items: [], nextCursor: null, hasMore: false });

    let q = supabaseServer
      .from("albums")
      .select("id, title, artist, year, genre, cover_url, spotify_id, created_at, ratings(user_id, score)")
      .in("id", scoreIds);
    if (search) q = q.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
    if (genre) q = q.eq("genre", genre);
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: (data ?? []).map(mapAlbum), nextCursor: null, hasMore: false });
  }

  // 미평가 앨범: 내가 평가한 album_id 목록 제외
  let excludeIds: string[] = [];
  if (unrated && userId) {
    for (let page = 0; ; page++) {
      const { data: rated } = await supabaseServer
        .from("ratings")
        .select("album_id")
        .eq("user_id", userId)
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!rated || rated.length === 0) break;
      excludeIds.push(...rated.map((r) => r.album_id));
      if (rated.length < 1000) break;
    }
  }

  // 일반 정렬: DB 쿼리
  let query = supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, created_at, ratings(user_id, score)")
    .limit(limit + 1);

  if (search) query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
  if (genre) query = query.eq("genre", genre);
  if (excludeIds.length > 0) query = query.not("id", "in", `(${excludeIds.join(",")})`);

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
    if (cursor) query = query.gt("created_at", cursor);
  } else if (sort === "title") {
    query = query.order("title", { ascending: true });
    if (cursor) query = query.gt("title", cursor);
  } else {
    // newest (기본)
    query = query.order("created_at", { ascending: false });
    if (cursor) query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = data ?? [];
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  const mapped = page.map(mapAlbum);
  const nextCursor = hasMore
    ? sort === "title"
      ? mapped[mapped.length - 1].title
      : sort === "oldest" || sort === "newest"
        ? (page[page.length - 1] as { created_at?: string }).created_at ?? null
        : String(mapped[mapped.length - 1].id)
    : null;

  return NextResponse.json({ items: mapped, nextCursor, hasMore });
}

// 내 평점 기준 정렬
async function handleMySort(params: {
  limit: number;
  cursor: string | null;
  search?: string;
  genre?: string;
  sort: string;
  userId: string;
  unrated: boolean;
}) {
  const { limit, cursor, search, genre, sort, userId } = params;

  const myRatingsAll: { album_id: string; score: number }[] = [];
  for (let page = 0; ; page++) {
    const { data: myRatings } = await supabaseServer
      .from("ratings")
      .select("album_id, score")
      .eq("user_id", userId)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!myRatings || myRatings.length === 0) break;
    myRatingsAll.push(...myRatings);
    if (myRatings.length < 1000) break;
  }
  const myScoreMap = new Map(myRatingsAll.map((r) => [r.album_id, r.score]));

  let albumQuery = supabaseServer.from("albums").select("id");
  if (search) albumQuery = albumQuery.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
  if (genre) albumQuery = albumQuery.eq("genre", genre);

  const { data: allAlbums } = await albumQuery;

  const sorted = (allAlbums ?? [])
    .filter((a) => myScoreMap.has(a.id))
    .map((a) => ({ id: a.id, score: myScoreMap.get(a.id)! }))
    .sort((a, b) => sort === "my_desc" ? b.score - a.score : a.score - b.score);

  let startIndex = 0;
  if (cursor) {
    const idx = sorted.findIndex((a) => a.id === cursor);
    startIndex = idx >= 0 ? idx + 1 : 0;
  }

  const pageSlice = sorted.slice(startIndex, startIndex + limit + 1);
  const hasMore = pageSlice.length > limit;
  const pageItems = pageSlice.slice(0, limit);
  const pageIds = pageItems.map((a) => a.id);

  if (pageIds.length === 0) {
    return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
  }

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, ratings(user_id, score)")
    .in("id", pageIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orderMap = new Map(pageIds.map((id, i) => [id, i]));
  const reordered = (data ?? []).sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;
  return NextResponse.json({ items: reordered.map(mapAlbum), nextCursor, hasMore });
}

// avg 정렬: 전체 평점 집계 후 정렬 → index 기반 페이지네이션
async function handleAvgSort(params: {
  limit: number;
  cursor: string | null;
  search?: string;
  genre?: string;
  sort: string;
  userId?: string;
  unrated?: boolean;
}) {
  const { limit, cursor, search, genre, sort, userId, unrated } = params;

  let excludeIds: string[] = [];
  if (unrated && userId) {
    for (let page = 0; ; page++) {
      const { data: rated } = await supabaseServer
        .from("ratings")
        .select("album_id")
        .eq("user_id", userId)
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (!rated || rated.length === 0) break;
      excludeIds.push(...rated.map((r) => r.album_id));
      if (rated.length < 1000) break;
    }
  }

  // 1. 전체 평점 집계
  const ratingData: { album_id: string; score: number }[] = [];
  for (let page = 0; ; page++) {
    const { data } = await supabaseServer
      .from("ratings")
      .select("album_id, score")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    ratingData.push(...data);
    if (data.length < 1000) break;
  }

  const totalMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  for (const r of ratingData ?? []) {
    totalMap.set(r.album_id, (totalMap.get(r.album_id) ?? 0) + r.score);
    countMap.set(r.album_id, (countMap.get(r.album_id) ?? 0) + 1);
  }

  // 2. 필터 조건에 맞는 앨범 ID 목록 가져오기
  let albumQuery = supabaseServer.from("albums").select("id");
  if (search) albumQuery = albumQuery.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
  if (genre) albumQuery = albumQuery.eq("genre", genre);
  if (excludeIds.length > 0) albumQuery = albumQuery.not("id", "in", `(${excludeIds.join(",")})`);

  const { data: allAlbums } = await albumQuery;

  // 3. 전체 정렬
  const sorted = (allAlbums ?? [])
    .map((a) => {
      const total = totalMap.get(a.id);
      const count = countMap.get(a.id) ?? 0;
      const avg = total != null && count > 0 ? total / count : null;
      return { id: a.id, avg };
    })
    .sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0;
      if (a.avg === null) return 1;
      if (b.avg === null) return -1;
      return sort === "avg_desc" ? b.avg - a.avg : a.avg - b.avg;
    });

  // 4. 커서 기반 페이지네이션 (index)
  let startIndex = 0;
  if (cursor) {
    const idx = sorted.findIndex((a) => a.id === cursor);
    startIndex = idx >= 0 ? idx + 1 : 0;
  }

  const pageSlice = sorted.slice(startIndex, startIndex + limit + 1);
  const hasMore = pageSlice.length > limit;
  const pageItems = pageSlice.slice(0, limit);
  const pageIds = pageItems.map((a) => a.id);

  if (pageIds.length === 0) {
    return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
  }

  // 5. 실제 앨범 데이터 조회
  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, ratings(user_id, score)")
    .in("id", pageIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 6. 정렬 순서 복원
  const orderMap = new Map(pageIds.map((id, i) => [id, i]));
  const reordered = (data ?? []).sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

  return NextResponse.json({ items: reordered.map(mapAlbum), nextCursor, hasMore });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, artist, year, release_date, genre, cover_url, tracklist } = body;

  if (!title?.trim() || !artist?.trim()) {
    return NextResponse.json({ error: "title and artist required" }, { status: 400 });
  }

  // 중복 체크
  const { data: existing } = await supabaseServer
    .from("albums")
    .select("id, title, artist")
    .ilike("title", title.trim())
    .ilike("artist", artist.trim())
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: `이미 등록된 음반입니다 (${existing.artist} - ${existing.title})`, duplicate: true, id: existing.id },
      { status: 409 }
    );
  }

  const newId = crypto.randomUUID();

  const { data, error } = await supabaseServer
    .from("albums")
    .insert({ id: newId, title: title.trim(), artist: artist.trim(), year, release_date, genre, cover_url, tracklist })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

function mapAlbum(album: {
  id: string;
  title: string;
  artist: string;
  year?: string | null;
  genre?: string | null;
  cover_url?: string | null;
  spotify_id?: string | null;
  ratings?: { user_id: string; score: number }[];
}) {
  const ratings = (album.ratings ?? []) as { user_id: string; score: number }[];
  const scores = ratings.map((r) => r.score).filter((s) => typeof s === "number");
  const avg =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  return {
    id: album.id,
    title: album.title,
    artist: album.artist,
    year: album.year,
    genre: album.genre,
    cover_url: album.cover_url,
    spotify_id: album.spotify_id,
    ratings,
    avg,
  };
}
