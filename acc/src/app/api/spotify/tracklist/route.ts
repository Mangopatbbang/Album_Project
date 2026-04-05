import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const spotifyId = new URL(req.url).searchParams.get("spotifyId");
  if (!spotifyId) return NextResponse.json({ error: "spotifyId 필요" }, { status: 400 });

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/albums/${spotifyId}/tracks?limit=50&market=KR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return NextResponse.json({ error: `Spotify API 오류: ${res.status}` }, { status: 502 });

    const data = await res.json();
    const tracks: string[] = (data.items ?? [])
      .sort((a: { track_number: number }, b: { track_number: number }) => a.track_number - b.track_number)
      .map((t: { name: string }) => t.name);

    return NextResponse.json({ tracks, tracklist: tracks.join("; ") });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
