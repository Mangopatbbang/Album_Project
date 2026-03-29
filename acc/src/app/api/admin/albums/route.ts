import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "no_cover";
  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

  let query = supabaseServer
    .from("albums")
    .select("id, title, artist, cover_url, spotify_id")
    .order("title", { ascending: true })
    .limit(limit);

  if (filter === "no_cover") query = query.is("cover_url", null);
  if (filter === "no_spotify") query = query.is("spotify_id", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ albums: data ?? [] });
}
