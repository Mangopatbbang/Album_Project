import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("watchlist")
    .select("album_id, created_at, albums(id, title, artist, year, genre, cover_url, spotify_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId, albumId } = await req.json();
  if (!userId || !albumId) return NextResponse.json({ error: "userId and albumId required" }, { status: 400 });

  const { error } = await supabaseServer
    .from("watchlist")
    .upsert({ user_id: userId, album_id: albumId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, albumId } = await req.json();
  if (!userId || !albumId) return NextResponse.json({ error: "userId and albumId required" }, { status: 400 });

  const { error } = await supabaseServer
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("album_id", albumId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
