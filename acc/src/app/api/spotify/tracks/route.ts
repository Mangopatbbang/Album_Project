import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ tracklist: null });

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/albums/${id}/tracks?limit=50&market=KR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return NextResponse.json({ tracklist: null });
    const data = await res.json();
    const tracks = (data.items ?? []) as { name: string; track_number: number }[];
    if (!tracks.length) return NextResponse.json({ tracklist: null });
    const tracklist = tracks
      .sort((a, b) => a.track_number - b.track_number)
      .map((t) => t.name)
      .join("; ");
    return NextResponse.json({ tracklist });
  } catch {
    return NextResponse.json({ tracklist: null });
  }
}
