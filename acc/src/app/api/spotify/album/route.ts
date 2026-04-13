import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

// Spotify 앨범 ID or URL → 앨범 메타데이터 반환
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!raw) return NextResponse.json({ error: "id required" }, { status: 400 });

  // URL에서 ID 추출 (https://open.spotify.com/album/ID 또는 spotify:album:ID)
  const idMatch =
    raw.match(/spotify\.com\/album\/([A-Za-z0-9]+)/) ??
    raw.match(/spotify:album:([A-Za-z0-9]+)/) ??
    raw.match(/^([A-Za-z0-9]{22})$/);
  const id = idMatch?.[1] ?? raw;

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/albums/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 404) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!res.ok) return NextResponse.json({ error: "spotify_error" }, { status: 502 });

    const data = await res.json();
    const allArtists: { name: string }[] = data.artists ?? [];

    return NextResponse.json({
      spotify_id: data.id,
      name: data.name,
      artist: allArtists[0]?.name ?? "",
      extra_artists: allArtists.slice(1).map((a) => a.name).join("; "),
      cover_url: data.images?.[0]?.url ?? "",
      release_date: data.release_date ?? "",
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
