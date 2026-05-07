import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { count: total } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true });

  const { count: hasSpotify } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .not("spotify_id", "is", null);

  const { count: hasCover } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .not("cover_url", "is", null);

  const { count: hasTracklist } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .not("tracklist", "is", null);

  return NextResponse.json({
    total: total ?? 0,
    hasSpotify: hasSpotify ?? 0,
    hasCover: hasCover ?? 0,
    hasTracklist: hasTracklist ?? 0,
  });
}
