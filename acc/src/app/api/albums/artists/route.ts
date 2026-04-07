import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  const { data } = await supabaseServer
    .from("albums")
    .select("artist")
    .ilike("artist", `%${q}%`)
    .limit(60);

  const artists = [...new Set((data ?? []).map((a: { artist: string }) => a.artist))].slice(0, 10);
  return NextResponse.json(artists);
}
