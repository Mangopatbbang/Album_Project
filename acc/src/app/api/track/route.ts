import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  const userId = authed?.id ?? null;

  const body = await req.json();
  const { type, ...data } = body;

  if (type === "album_visit") {
    const { album_id, source } = data;
    if (!album_id || !source) return NextResponse.json({ ok: false });
    await supabaseServer.from("album_visits").insert({ user_id: userId, album_id, source });
  } else if (type === "artist_visit") {
    const { artist_name, source } = data;
    if (!artist_name) return NextResponse.json({ ok: false });
    await supabaseServer.from("artist_visits").insert({ user_id: userId, artist_name, source });
  } else if (type === "search") {
    const { query, results_count } = data;
    if (!query) return NextResponse.json({ ok: false });
    await supabaseServer.from("search_logs").insert({ user_id: userId, query, results_count: results_count ?? 0 });
  } else if (type === "page_view" || type === "tab_click" || type === "feature_click") {
    await supabaseServer.from("events").insert({
      user_id: userId,
      type,
      path: data.path ?? null,
      data: { ...data },
      device: data.device ?? null,
    });
  } else {
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}
