import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

// 검색 결과 없을 때 Spotify 실제 아티스트명 힌트 반환
export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist")?.trim() ?? "";
  if (!artist) return NextResponse.json({ hints: [] });

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=5&market=KR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return NextResponse.json({ hints: [] });
    const data = await res.json();
    const hints = (data.artists?.items ?? [])
      .slice(0, 3)
      .map((a: { name: string; followers: { total: number }; images: { url: string }[] }) => ({
        name: a.name,
        followers: a.followers?.total ?? 0,
        image: a.images?.[0]?.url ?? null,
      }));
    return NextResponse.json({ hints });
  } catch {
    return NextResponse.json({ hints: [] });
  }
}
