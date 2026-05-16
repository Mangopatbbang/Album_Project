import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";
import { supabaseServer } from "@/lib/supabase";

// 아티스트 이름으로 Spotify에서 사진 + 장르 태그 반환
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";
  if (!name) return NextResponse.json({ image_url: null, genres: [] });

  // DB 오버라이드 우선 확인
  const { data: override } = await supabaseServer
    .from("artist_images")
    .select("image_url")
    .eq("artist_name", name)
    .maybeSingle();
  if (override?.image_url) return NextResponse.json({ image_url: override.image_url, genres: [] });

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=5`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ image_url: null, genres: [] });

    const data = await res.json();
    const items: {
      name: string;
      popularity: number;
      genres: string[];
      images: { url: string; width: number; height: number }[];
    }[] = data.artists?.items ?? [];

    if (items.length === 0) return NextResponse.json({ image_url: null, genres: [] });

    // 이름이 정확히 일치하는 항목 우선, 없으면 인기도 기준 첫 번째
    const exact = items.find(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    );
    const artist = exact ?? items[0];

    // 이미지는 너비 320~640px 범위 우선, 없으면 첫 번째
    const image =
      artist.images.find((img) => img.width >= 320 && img.width <= 640) ??
      artist.images[0] ??
      null;

    return NextResponse.json({
      image_url: image?.url ?? null,
      genres: artist.genres ?? [],
    });
  } catch {
    return NextResponse.json({ image_url: null, genres: [] });
  }
}
