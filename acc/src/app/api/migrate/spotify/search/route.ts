import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const artist = searchParams.get("artist") ?? "";

  if (!title && !artist) return NextResponse.json({ error: "title 또는 artist 필요" }, { status: 400 });

  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    return NextResponse.json({ results: [], error: "token_failed", message: "Spotify 인증 실패. 잠시 후 다시 시도해주세요." });
  }

  const sanitize = (s: string) => s.replace(/[*^]/g, "").replace(/\s+/g, " ").trim();
  const t = sanitize(title);
  const a = sanitize(artist);

  const seen = new Set<string>();
  const allResults: { spotify_id: string; name: string; artist: string; cover_url: string; release_date: string }[] = [];

  async function fetchPage(q: string, offset = 0): Promise<{ id: string; name: string; artists: { name: string }[]; images: { url: string }[]; release_date: string }[]> {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=20&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 429) throw new Error("rate_limit");
    if (!res.ok) {
      console.error(`Spotify search failed: ${res.status} for query "${q}"`);
      return [];
    }
    const data = await res.json();
    return data.albums?.items ?? [];
  }

  // 쿼리 조합 병렬 실행
  const queryPromises: Promise<{ id: string; name: string; artists: { name: string }[]; images: { url: string }[]; release_date: string }[]>[] = [];

  if (t && a) queryPromises.push(fetchPage(`${t} ${a}`));
  if (t) queryPromises.push(fetchPage(t));
  if (a) {
    queryPromises.push(fetchPage(a, 0));
    queryPromises.push(fetchPage(a, 20));
  }

  let pages: { id: string; name: string; artists: { name: string }[]; images: { url: string }[]; release_date: string }[][];
  try {
    pages = await Promise.all(queryPromises);
  } catch (err) {
    if (err instanceof Error && err.message === "rate_limit") {
      return NextResponse.json({ results: [], error: "rate_limit", message: "Spotify API 요청 한도 초과 (Rate Limit). 잠시 후 다시 시도해주세요." });
    }
    return NextResponse.json({ results: [], error: "fetch_failed", message: "Spotify 검색 중 오류가 발생했습니다." });
  }

  for (const items of pages) {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      allResults.push({
        spotify_id: item.id,
        name: item.name,
        artist: item.artists?.[0]?.name ?? "",
        cover_url: item.images?.[0]?.url ?? "",
        release_date: item.release_date ?? "",
      });
    }
  }

  return NextResponse.json({ results: allResults });
}
