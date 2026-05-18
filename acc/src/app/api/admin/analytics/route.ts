import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const period = parseInt(searchParams.get("period") ?? "30");
  const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [usersRes, ratingsRes, eventsRes, searchRes, albumVisitsRes, watchlistRes, albumsRes] = await Promise.all([
    supabaseServer.from("users").select("id, display_name, avatar_url, role"),
    supabaseServer.from("ratings").select("user_id, score, created_at, updated_at"),
    supabaseServer.from("events").select("type, path, data, device, created_at, user_id").gte("created_at", since),
    supabaseServer.from("search_logs").select("query, results_count, created_at").gte("created_at", since),
    supabaseServer.from("album_visits").select("album_id, created_at").gte("created_at", since),
    supabaseServer.from("watchlist").select("album_id"),
    supabaseServer.from("albums").select("id, title, artist, cover_url"),
  ]);

  const users = usersRes.data ?? [];
  const ratings = ratingsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const searchLogs = searchRes.data ?? [];
  const albumVisits = albumVisitsRes.data ?? [];
  const watchlistItems = watchlistRes.data ?? [];
  const albums = albumsRes.data ?? [];
  const albumMap = new Map(albums.map((a) => [a.id, a]));

  // ── 멤버 활동
  const memberActivity = users.map((u) => {
    const ur = ratings.filter((r) => r.user_id === u.id);
    const sorted = [...ur].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    const avg = ur.length ? ur.reduce((s, r) => s + r.score, 0) / ur.length : null;
    const recentCount = ur.filter((r) => new Date(r.updated_at) >= new Date(weekAgo)).length;
    return {
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      role: u.role,
      total_ratings: ur.length,
      recent_ratings: recentCount,
      avg_score: avg !== null ? Math.round(avg * 10) / 10 : null,
      last_rating_at: sorted[0]?.updated_at ?? null,
      is_active: recentCount > 0,
    };
  }).sort((a, b) => (b.last_rating_at ?? "").localeCompare(a.last_rating_at ?? ""));

  // ── 페이지 뷰
  const pageViews = events.filter((e) => e.type === "page_view");
  const pvMap = new Map<string, number>();
  for (const e of pageViews) {
    const p = (e.data as Record<string, string>)?.path ?? e.path ?? "unknown";
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
    return { album_id: id, count, title: a?.title ?? "", artist: a?.artist ?? "", cover_url: a?.cover_url ?? null };
  });

  // ── 위시리스트 인기
  const wlMap = new Map<string, number>();
  for (const w of watchlistItems) wlMap.set(w.album_id, (wlMap.get(w.album_id) ?? 0) + 1);
  const topWatchlist = [...wlMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => {
    const a = albumMap.get(id);
    return { album_id: id, count, title: a?.title ?? "", artist: a?.artist ?? "", cover_url: a?.cover_url ?? null };
  });

  // ── 기기 비율
  const mobile = pageViews.filter((e) => (e.data as Record<string, string>)?.device === "mobile" || e.device === "mobile").length;
  const desktop = pageViews.length - mobile;

  // ── KPI
  const weekRatings = ratings.filter((r) => new Date(r.created_at) >= new Date(weekAgo)).length;
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
