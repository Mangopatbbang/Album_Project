import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";
import { spotifyLimiter, getIP, checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(spotifyLimiter, getIP(req));
  if (limited) return limited;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ tracklist: null });

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/albums/${id}/tracks?limit=50&market=KR`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ tracklist: null });
    const data = await res.json();
    const tracks = (data.items ?? []) as { name: string; track_number: number; duration_ms: number }[];
    if (!tracks.length) return NextResponse.json({ tracklist: null, track_durations: null });
    const sorted = tracks.sort((a, b) => a.track_number - b.track_number);
    const tracklist = sorted.map((t) => t.name).join("; ");
    const track_durations = sorted.map((t) => t.duration_ms).join("; ");
    return NextResponse.json({ tracklist, track_durations });
  } catch {
    return NextResponse.json({ tracklist: null });
  }
}
