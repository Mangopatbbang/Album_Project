import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const artist = searchParams.get("artist") ?? "";

  if (!title && !artist) return NextResponse.json({ error: "title 또는 artist 필요" }, { status: 400 });

  const token = await getAccessToken();

  // Spotify 쿼리 파서에서 와일드카드/특수문자로 해석되는 문자 제거
  const sanitize = (s: string) => s.replace(/[*^]/g, "").replace(/\s+/g, " ").trim();
  const t = sanitize(title);
  const a = sanitize(artist);

  // title+artist 조합, title 단독, artist 필드 필터(아티스트 전체 앨범), artist 단독 순으로 시도
  // artist: 필드 필터는 한글/영문에서 안전, *^등 특수문자는 title에서만 문제
  const queries = t && a
    ? [`${t} ${a}`, t, `artist:${a}`, a]
    : t
    ? [t]
    : [`artist:${a}`, a];

  const seen = new Set<string>();
  const results: { spotify_id: string; name: string; artist: string; cover_url: string; release_date: string }[] = [];

  for (const q of queries) {
    if (results.length >= 50) break;
    const isArtistFilter = q.startsWith("artist:");
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=${isArtistFilter ? 50 : 20}&market=KR`,
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
