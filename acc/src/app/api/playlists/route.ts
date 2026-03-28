import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("playlists")
    .select(`
      id, title, user_id, created_at,
      playlist_entries(
        id, sort_order, comment,
        albums(id, title, artist, cover_url)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((p) => ({
    ...p,
    playlist_entries: (p.playlist_entries ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, title, entries } = body;

  if (!user_id || !title || !entries?.length) {
    return NextResponse.json({ error: "user_id, title, entries required" }, { status: 400 });
  }

  const { data: playlist, error: plErr } = await supabaseServer
    .from("playlists")
    .insert({ user_id, title })
    .select()
    .single();

  if (plErr) return NextResponse.json({ error: plErr.message }, { status: 500 });

  const entryRows = entries.map((e: { album_id: string; comment: string; sort_order: number }) => ({
    playlist_id: playlist.id,
    album_id: e.album_id,
    comment: e.comment ?? "",
    sort_order: e.sort_order,
  }));

  const { error: entErr } = await supabaseServer.from("playlist_entries").insert(entryRows);
  if (entErr) return NextResponse.json({ error: entErr.message }, { status: 500 });

  return NextResponse.json({ id: playlist.id }, { status: 201 });
}
