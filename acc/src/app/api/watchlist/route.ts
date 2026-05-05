import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import { validateUser } from "@/lib/validateUser";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("watchlist")
    .select("album_id, created_at, albums(id, title, artist, use_artist_variant, year, release_date, genre, cover_url, spotify_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // artist_display 해상도 적용
  type WatchlistRow = { album_id: string; created_at: string; albums: { id: string; title: string; artist: string; use_artist_variant: boolean | null; year: string | null; release_date: string | null; genre: string | null; cover_url: string | null; spotify_id: string | null; artist_display?: string } | null };
  const items = (data ?? []) as unknown as WatchlistRow[];
  const albumObjs = items.map((i) => i.albums).filter((a): a is NonNullable<typeof a> => a != null);
  if (albumObjs.length > 0) {
    const resolved = await resolveArtistDisplay(albumObjs);
    const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display]));
    for (const item of items) {
      if (item.albums) {
        item.albums.artist_display = displayMap.get(item.albums.id);
      }
    }
  }
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { userId, albumId } = await req.json();
  if (!userId || !albumId) return NextResponse.json({ error: "userId and albumId required" }, { status: 400 });
  if (!(await validateUser(userId))) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { error } = await supabaseServer
    .from("watchlist")
    .upsert({ user_id: userId, album_id: albumId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, albumId } = await req.json();
  if (!userId || !albumId) return NextResponse.json({ error: "userId and albumId required" }, { status: 400 });
  if (!(await validateUser(userId))) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { error } = await supabaseServer
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("album_id", albumId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
