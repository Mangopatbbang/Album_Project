import { NextRequest, NextResponse } from "next/server";
import { searchItunesAlbum, fetchItunesTracklist } from "@/lib/itunes";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim();
  const artist = req.nextUrl.searchParams.get("artist")?.trim();

  if (!title || !artist) {
    return NextResponse.json({ error: "title and artist required" }, { status: 400 });
  }

  const result = await searchItunesAlbum(title, artist);
  if (!result) {
    return NextResponse.json({ found: false });
  }

  const tracklist = await fetchItunesTracklist(result.collection_id);

  return NextResponse.json({
    found: true,
    cover_url: result.cover_url,
    name: result.name,
    artist: result.artist,
    release_date: result.release_date,
    tracklist,
  });
}
