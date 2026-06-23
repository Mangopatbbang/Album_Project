import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const otherId = req.nextUrl.searchParams.get("with");
  if (!otherId) return NextResponse.json({ error: "missing ?with=" }, { status: 400 });

  const [{ data: myRatings }, { data: theirRatings }] = await Promise.all([
    supabaseServer
      .from("ratings")
      .select("album_id, score, albums(id, title, artist, cover_url)")
      .eq("user_id", userId),
    supabaseServer
      .from("ratings")
      .select("album_id, score")
      .eq("user_id", otherId),
  ]);

  if (!myRatings || !theirRatings) return NextResponse.json({ albums: [] });

  const theirMap = new Map<string, number>(theirRatings.map((r) => [r.album_id, r.score]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const albums = (myRatings as unknown as {
    album_id: string;
    score: number;
    albums: { id: string; title: string; artist: string; cover_url: string | null } | null;
  }[])
    .filter((r) => theirMap.has(r.album_id) && r.albums)
    .map((r) => ({
      id: r.albums!.id,
      title: r.albums!.title,
      artist: r.albums!.artist,
      coverUrl: r.albums!.cover_url,
      myScore: r.score,
      theirScore: theirMap.get(r.album_id)!,
      diff: Math.abs(r.score - theirMap.get(r.album_id)!),
    }))
    .sort((a, b) => b.diff - a.diff || a.title.localeCompare(b.title, "ko"));

  return NextResponse.json({ albums });
}
