import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: following } = await supabaseServer
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (!following || following.length === 0) return NextResponse.json([]);

  const followingIds = following.map((f: { following_id: string }) => f.following_id);

  const { data: ratings } = await supabaseServer
    .from("ratings")
    .select("user_id, score, one_line_review, updated_at, albums(id, title, artist, use_artist_variant, cover_url), users(id, display_name, emoji, avatar_url)")
    .in("user_id", followingIds)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (!ratings) return NextResponse.json([]);

  type Row = {
    user_id: string;
    score: number;
    one_line_review: string | null;
    updated_at: string;
    albums: { id: string; title: string; artist: string; use_artist_variant: boolean | null; cover_url: string | null } | null;
    users: { id: string; display_name: string; emoji: string | null; avatar_url: string | null } | null;
  };

  const rows = ratings as unknown as Row[];
  const albumObjs = rows.filter(r => r.albums).map(r => r.albums!);
  const resolved = await resolveArtistDisplay(albumObjs);
  const displayMap = new Map(resolved.map(a => [a.id, a.artist_display]));

  return NextResponse.json(
    rows
      .filter(r => r.albums && r.users)
      .map(r => ({
        user_id: r.user_id,
        display_name: r.users!.display_name,
        emoji: r.users!.emoji,
        avatar_url: r.users!.avatar_url,
        score: r.score,
        one_line_review: r.one_line_review,
        updated_at: r.updated_at,
        album_id: r.albums!.id,
        album_title: r.albums!.title,
        album_artist_display: displayMap.get(r.albums!.id) ?? r.albums!.artist,
        album_cover_url: r.albums!.cover_url,
      }))
  );
}
