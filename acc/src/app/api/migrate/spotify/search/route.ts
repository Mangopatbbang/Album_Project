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

  const seen = new Set<string>();
  const results: { spotify_id: string; name: string; artist: string; cover_url: string; release_date: string }[] = [];

  // Spotify API limit 최대 20, 여러 페이지 fetch
  async function runQuery(q: string, pages = 1) {
    for (let page = 0; page < pages; page++) {
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=20&offset=${page * 20}&market=KR`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const items = data.albums?.items ?? [];
      for (const item of items) {
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
      if (items.length < 20) break; // 마지막 페이지면 중단
    }
  }

  // 제목+아티스트 조합, 제목 단독
  if (t && a) await runQuery(`${t} ${a}`);
  if (t) await runQuery(t);

  // 아티스트 단독은 항상 실행 — 5페이지(100개)까지 탐색
  if (a) {
    await runQuery(`artist:${a}`, 5);
    await runQuery(a, 5);
  }

  return NextResponse.json({ results });
}
