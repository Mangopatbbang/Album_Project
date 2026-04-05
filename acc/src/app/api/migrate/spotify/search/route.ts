import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const artist = searchParams.get("artist") ?? "";

  if (!title && !artist) return NextResponse.json({ error: "title 또는 artist 필요" }, { status: 400 });

  const token = await getAccessToken();

  const queries = title
    ? [
        `album:${title}${artist ? ` artist:${artist}` : ""}`,
        `${title}${artist ? ` ${artist}` : ""}`,
        title,
      ]
    : [
        `artist:${artist}`,
        artist,
      ];

  const seen = new Set<string>();
  const results: { spotify_id: string; name: string; artist: string; cover_url: string; release_date: string }[] = [];

  for (const q of queries) {
    if (results.length >= 8) break;
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=5&market=KR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) continue;
    const data = await res.json();
    for (const item of data.albums?.items ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      results.push({
        spotify_id: item.id,
        name: item.name,
        artist: item.artists?.[0]?.name ?? "",
        cover_url: item.images?.[0]?.url ?? "",
        release_date: item.release_date ?? "",
      });
    }
  }

  return NextResponse.json({ results });
}
