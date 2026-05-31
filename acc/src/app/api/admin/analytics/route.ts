import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

async function fetchAll<T>(
  queryFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await queryFn(from, from + pageSize - 1);
    if (error || !data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = parseInt(searchParams.get("period") ?? "30");
  const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // KST 오늘 자정 (UTC 기준으로 변환)
  const kstOffset = 9 * 60 * 60 * 1000;
  const todayKSTMidnight = Math.floor((Date.now() + kstOffset) / 86400000) * 86400000 - kstOffset;
  const todayISO = new Date(todayKSTMidnight).toISOString();

  const [usersRes, totalRatingsRes, activityRes, searchRes, watchlistRes, albumsRes] = await Promise.all([
    supabaseServer.from("users").select("id, display_name, avatar_url, role").limit(500),
    supabaseServer.from("ratings").select("*", { count: "exact", head: true }),
    supabaseServer.from("activity_logs")
      .select("user_id, action, created_at")
      .in("action", ["rating_set", "rating_delete"])
      .gte("created_at", weekAgo)
      .limit(5000),
    supabaseServer.from("search_logs").select("query, results_count, created_at").gte("created_at", since).limit(500),
    supabaseServer.from("watchlist").select("album_id", { count: "exact" }).limit(2000),
    supabaseServer.from("albums").select("id, title, artist, cover_url").limit(2000),
  ]);

  const [ratings, events, albumVisits] = await Promise.all([
    fetchAll<{ user_id: string; album_id: string; score: number; updated_at: string }>((from, to) =>
      supabaseServer.from("ratings").select("user_id, album_id, score, updated_at").range(from, to)
    ),
    fetchAll<{ type: string; path: string | null; data: Record<string, unknown>; device: string | null; created_at: string; user_id: string | null }>((from, to) =>
      supabaseServer.from("events").select("type, path, data, device, created_at, user_id").gte("created_at", since).range(from, to)
    ),
    fetchAll<{ album_id: string; user_id: string | null; source: string | null; created_at: string }>((from, to) =>
      supabaseServer.from("album_visits").select("album_id, user_id, source, created_at").gte("created_at", since).range(from, to)
    ),
  ]);

  const users = usersRes.data ?? [];
  const totalRatingsCount = totalRatingsRes.count ?? ratings.length;
  const activityLogs = activityRes.data ?? [];
  const searchLogs = searchRes.data ?? [];
  const watchlistItems = watchlistRes.data ?? [];
  const albums = albumsRes.data ?? [];
  const albumMap = new Map(albums.map((a) => [a.id, a]));

  // ── 멤버 활동
  // activity_logs(7일 이내) + ratings.created_at(7일 이내) 둘 다 체크해서 더 많은 쪽 사용
  // last_rating_at은 activity_logs 최신 vs ratings 최신 중 더 최근 것
  const memberActivity = users.map((u) => {
    const ur = ratings.filter((r) => r.user_id === u.id);
    const userLogs = activityLogs.filter((l) => l.user_id === u.id);

    const avg = ur.length ? ur.reduce((s, r) => s + r.score, 0) / ur.length : null;

    // 최근 7일 활동: activity_logs 기준 (등록+수정 모두 포함) + 없으면 ratings.updated_at 기준 fallback
    const recentFromLogs = userLogs.filter((l) => l.action === "rating_set").length;
    const recentFromRatings = ur.filter((r) => new Date(r.updated_at) >= new Date(weekAgo)).length;
    const recentCount = recentFromLogs > 0 ? recentFromLogs : recentFromRatings;

    // 마지막 평가: activity_logs 최신 vs ratings.updated_at 최신 중 더 최근 것
    const latestLog = userLogs.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? null;
    const latestRating = [...ur].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.updated_at ?? null;
    const lastActivityAt =
      !latestLog ? latestRating :
      !latestRating ? latestLog :
      latestLog > latestRating ? latestLog : latestRating;

    return {
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      role: u.role,
      total_ratings: ur.length,
      recent_ratings: recentCount,
      avg_score: avg !== null ? Math.round(avg * 10) / 10 : null,
      last_rating_at: lastActivityAt,
      is_active: recentCount > 0,
    };
  }).sort((a, b) => (b.last_rating_at ?? "").localeCompare(a.last_rating_at ?? ""));

  // ── 페이지 뷰
  const pageViews = events.filter((e) => e.type === "page_view");
  const pvMap = new Map<string, number>();
  for (const e of pageViews) {
    const p = (e as Record<string, unknown>).path as string ?? (e.data as Record<string, string>)?.path ?? "unknown";
    pvMap.set(p, (pvMap.get(p) ?? 0) + 1);
  }
  const topPages = [...pvMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([path, count]) => ({ path, count }));

  // ── 기능 클릭
  const fcMap = new Map<string, number>();
  for (const e of events.filter((e) => e.type === "feature_click")) {
    const f = (e.data as Record<string, string>)?.feature ?? "unknown";
    fcMap.set(f, (fcMap.get(f) ?? 0) + 1);
  }
  const topFeatures = [...fcMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([feature, count]) => ({ feature, count }));

  // ── 검색어
  const qMap = new Map<string, { count: number; total: number }>();
  for (const s of searchLogs) {
    const x = qMap.get(s.query) ?? { count: 0, total: 0 };
    qMap.set(s.query, { count: x.count + 1, total: x.total + (s.results_count ?? 0) });
  }
  const topSearches = [...qMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15)
    .map(([query, d]) => ({ query, count: d.count, avg_results: Math.round(d.total / d.count) }));

  // ── 인기 앨범
  const avMap = new Map<string, number>();
  for (const v of albumVisits) avMap.set(v.album_id, (avMap.get(v.album_id) ?? 0) + 1);
  const topAlbums = [...avMap.entries()].sort((a, b) => b[1] - a[1]).filter(([id]) => albumMap.has(id)).slice(0, 10).map(([id, count]) => {
    const a = albumMap.get(id)!;
    return { album_id: id, count, title: a.title, artist: a.artist, cover_url: a.cover_url ?? null };
  });

  // ── 위시리스트 인기
  const wlMap = new Map<string, number>();
  for (const w of watchlistItems) wlMap.set(w.album_id, (wlMap.get(w.album_id) ?? 0) + 1);
  const topWatchlist = [...wlMap.entries()].sort((a, b) => b[1] - a[1]).filter(([id]) => albumMap.has(id)).slice(0, 10).map(([id, count]) => {
    const a = albumMap.get(id)!;
    return { album_id: id, count, title: a.title, artist: a.artist, cover_url: a.cover_url ?? null };
  });

  // ── 기기 비율 (period 기준)
  const mobile = pageViews.filter((e) => (e as Record<string, unknown>).device === "mobile").length;
  const desktop = pageViews.length - mobile;

  // ── KPI
  const weekRatings = activityLogs.filter((l) => l.action === "rating_set").length;
  const todayVisits = pageViews.filter((e) => new Date(e.created_at) >= new Date(todayISO)).length;

  // ── 전환율 퍼널 (period 내 방문 → 올타임 평가)
  // 유저별: 이 기간에 몇 개 앨범 봤고, 그 중 몇 개를 결국 평가했나
  const ratedByUser = new Map<string, Set<string>>();
  for (const r of ratings) {
    if (!ratedByUser.has(r.user_id)) ratedByUser.set(r.user_id, new Set());
    ratedByUser.get(r.user_id)!.add(r.album_id);
  }
  const visitedByUser = new Map<string, Set<string>>();
  for (const v of albumVisits) {
    if (!v.user_id) continue;
    if (!visitedByUser.has(v.user_id)) visitedByUser.set(v.user_id, new Set());
    visitedByUser.get(v.user_id)!.add(v.album_id);
  }
  const userFunnel = users.map((u) => {
    const visited = visitedByUser.get(u.id) ?? new Set<string>();
    const rated = ratedByUser.get(u.id) ?? new Set<string>();
    const converted = [...visited].filter((id) => rated.has(id)).length;
    return {
      id: u.id, display_name: u.display_name, avatar_url: u.avatar_url,
      visits: visited.size, total_ratings: rated.size,
      converted, conversion_pct: visited.size > 0 ? Math.round(converted / visited.size * 100) : 0,
    };
  }).filter((u) => u.visits > 0).sort((a, b) => b.visits - a.visits);

  // source별 전환율
  const sourceVisitPairs = new Map<string, Set<string>>();
  for (const v of albumVisits) {
    if (!v.user_id) continue;
    const src = v.source ?? "unknown";
    if (!sourceVisitPairs.has(src)) sourceVisitPairs.set(src, new Set());
    sourceVisitPairs.get(src)!.add(`${v.user_id}:${v.album_id}`);
  }
  const sourceFunnel = [...sourceVisitPairs.entries()]
    .map(([source, pairs]) => {
      const converted = [...pairs].filter((pair) => {
        const [uid, aid] = pair.split(":");
        return ratedByUser.get(uid)?.has(aid) ?? false;
      }).length;
      return { source, visits: pairs.size, converted, conversion_pct: Math.round(converted / pairs.size * 100) };
    })
    .sort((a, b) => b.visits - a.visits);

  // ── 미전환 앨범 (period 내 2명 이상 방문했지만 아무도 평가 안 한 앨범)
  const visitUsersByAlbum = new Map<string, Set<string>>();
  for (const v of albumVisits) {
    if (!v.user_id) continue;
    if (!visitUsersByAlbum.has(v.album_id)) visitUsersByAlbum.set(v.album_id, new Set());
    visitUsersByAlbum.get(v.album_id)!.add(v.user_id);
  }
  const ratedAlbumIds = new Set(ratings.map((r) => r.album_id));
  const topUnconverted = [...visitUsersByAlbum.entries()]
    .filter(([aid, visitors]) => !ratedAlbumIds.has(aid) && visitors.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 8)
    .map(([aid, visitors]) => {
      const a = albumMap.get(aid);
      const visitorNames = [...visitors]
        .map((uid) => users.find((u) => u.id === uid)?.display_name ?? uid)
        .join(", ");
      return { album_id: aid, title: a?.title ?? aid, artist: a?.artist ?? "", cover_url: a?.cover_url ?? null, visit_count: visitors.size, visitors: visitorNames };
    });

  return NextResponse.json({
    period,
    kpis: { total_ratings: totalRatingsCount, week_ratings: weekRatings, today_visits: todayVisits, total_members: users.length },
    member_activity: memberActivity,
    top_pages: topPages,
    top_features: topFeatures,
    top_searches: topSearches,
    top_albums: topAlbums,
    top_watchlist: topWatchlist,
    device: { mobile, desktop },
    user_funnel: userFunnel,
    source_funnel: sourceFunnel,
    top_unconverted: topUnconverted,
  });
}
