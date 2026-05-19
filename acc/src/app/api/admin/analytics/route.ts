import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

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

  const [usersRes, ratingsRes, activityRes, eventsRes, searchRes, albumVisitsRes, watchlistRes, albumsRes] = await Promise.all([
    supabaseServer.from("users").select("id, display_name, avatar_url, role").limit(500),
    // ratings: limit 넉넉히 — total/avg 계산에 전체 필요
    supabaseServer.from("ratings").select("user_id, score, updated_at").limit(9999),
    // activity_logs: 7일 이내만 — 최근 활동 판단용
    supabaseServer.from("activity_logs")
      .select("user_id, action, created_at")
      .in("action", ["rating_set", "rating_delete"])
      .gte("created_at", weekAgo)
      .limit(9999),
    supabaseServer.from("events").select("type, path, data, device, created_at, user_id").gte("created_at", since).limit(9999),
    supabaseServer.from("search_logs").select("query, results_count, created_at").gte("created_at", since).limit(9999),
    supabaseServer.from("album_visits").select("album_id, created_at").gte("created_at", since).limit(9999),
    supabaseServer.from("watchlist").select("album_id").limit(9999),
    supabaseServer.from("albums").select("id, title, artist, cover_url").limit(9999),
  ]);

  const users = usersRes.data ?? [];
  const ratings = ratingsRes.data ?? [];
  const activityLogs = activityRes.data ?? [];
  const events = eventsRes.data ?? [];
  const searchLogs = searchRes.data ?? [];
  const albumVisits = albumVisitsRes.data ?? [];
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
  const topAlbums = [...avMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => {
    const a = albumMap.get(id);
    return { album_id: id, count, title: a?.title ?? "알 수 없음", artist: a?.artist ?? "", cover_url: a?.cover_url ?? null };
  });

  // ── 위시리스트 인기
  const wlMap = new Map<string, number>();
  for (const w of watchlistItems) wlMap.set(w.album_id, (wlMap.get(w.album_id) ?? 0) + 1);
  const topWatchlist = [...wlMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => {
    const a = albumMap.get(id);
    return { album_id: id, count, title: a?.title ?? "알 수 없음", artist: a?.artist ?? "", cover_url: a?.cover_url ?? null };
  });

  // ── 기기 비율 (period 기준)
  const mobile = pageViews.filter((e) => (e as Record<string, unknown>).device === "mobile").length;
  const desktop = pageViews.length - mobile;

  // ── KPI
  // 이번 주 새 평점: activity_logs 기반 (rating_set, 7일 이내)
  const weekRatings = activityLogs.filter((l) => l.action === "rating_set").length;
  // 오늘 방문: KST 자정 이후
  const todayVisits = pageViews.filter((e) => new Date(e.created_at) >= new Date(todayISO)).length;

  return NextResponse.json({
    period,
    kpis: { total_ratings: ratings.length, week_ratings: weekRatings, today_visits: todayVisits, total_members: users.length },
    member_activity: memberActivity,
    top_pages: topPages,
    top_features: topFeatures,
    top_searches: topSearches,
    top_albums: topAlbums,
    top_watchlist: topWatchlist,
    device: { mobile, desktop },
  });
}
