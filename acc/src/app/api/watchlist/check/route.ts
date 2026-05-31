import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const albumId = req.nextUrl.searchParams.get("albumId");
  if (!userId || !albumId) return NextResponse.json({ isWatchlisted: false });

  const { data } = await supabaseServer
    .from("watchlist")
    .select("album_id")
    .eq("user_id", userId)
    .eq("album_id", albumId)
    .maybeSingle();

  return NextResponse.json({ isWatchlisted: !!data }, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
