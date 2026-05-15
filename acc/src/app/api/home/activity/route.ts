import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

type Row = {
  score: number;
  one_line_review: string | null;
  updated_at: string;
  albums: {
    id: string;
    title: string;
    artist: string;
    use_artist_variant: boolean | null;
    cover_url: string | null;
    artist_display?: string;
  } | null;
};

export async function GET(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ items: [] });

  const { data } = await supabaseServer
    .from("ratings")
    .select("score, one_line_review, updated_at, albums(id, title, artist, use_artist_variant, cover_url)")
    .eq("user_id", authed.id)
    .not("score", "is", null)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (!data) return NextResponse.json({ items: [] });

  const rows = (data as unknown as Row[]).filter((r) => r.albums);
  const albumObjs = rows.map((r) => r.albums!);
  if (albumObjs.length > 0) {
    const resolved = await resolveArtistDisplay(albumObjs);
    const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display]));
    for (const row of rows) {
      if (row.albums) row.albums.artist_display = displayMap.get(row.albums.id) ?? row.albums.artist;
    }
  }

  const items = rows.map((r) => ({
    score: r.score,
    one_line_review: r.one_line_review,
    updated_at: r.updated_at,
    album_id: r.albums!.id,
    album_title: r.albums!.title,
    album_artist: r.albums!.artist,
    album_artist_display: r.albums!.artist_display ?? r.albums!.artist,
    album_cover_url: r.albums!.cover_url,
  }));

  return NextResponse.json({ items });
}
