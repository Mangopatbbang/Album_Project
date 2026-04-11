import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const artist = searchParams.get("artist") ?? "";

  if (!title && !artist) {
    return NextResponse.json({ error: "title 또는 artist 필요" }, { status: 400 });
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return NextResponse.json({
      results: [],
      error: "token_failed",
      message: `Spotify 인증 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
    });
  }

  // 특수문자 제거 (plain 쿼리용)
  const sanitize = (s: string) => s.replace(/[*^[\]]/g, "").replace(/\s+/g, " ").trim();
  const t = sanitize(title);
  const a = sanitize(artist);

  // album:/artist: 필드 필터용: & 등 필터를 깨는 문자도 제거
  const sanitizeField = (s: string) => s.replace(/[*^[\]&]/g, "").replace(/\s+/g, " ").trim();
  const tf = sanitizeField(title);
  const af = sanitizeField(artist);

  async function fetchPage(q: string, offset = 0) {
    try {
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=20&offset=${offset}&market=KR`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 429) return { rateLimit: true, items: [] };
      if (!res.ok) return { rateLimit: false, items: [] };
      const data = await res.json();
      return { rateLimit: false, items: data.albums?.items ?? [] };
    } catch {
      return { rateLimit: false, items: [] };
    }
  }

  // 쿼리 구성 — 모두 병렬
  const queries: { q: string; offset: number }[] = [];

  // 1) album:/artist: 필드 필터 (정밀도 높음, 특수문자 없을 때 효과적)
  if (tf && af) queries.push({ q: `album:${tf} artist:${af}`, offset: 0 });
  else if (tf)  queries.push({ q: `album:${tf}`, offset: 0 });

  // 2) 플레인 텍스트 (필드 필터 못 잡는 케이스 커버)
  if (t && a) queries.push({ q: `${t} ${a}`, offset: 0 });
  if (t)      queries.push({ q: t, offset: 0 });

  // 3) 아티스트 단독 2페이지 (아티스트 입력 시)
  if (a)      queries.push({ q: a, offset: 0 }, { q: a, offset: 20 });

  const pages = await Promise.all(queries.map(({ q, offset }) => fetchPage(q, offset)));

  if (pages.some((p) => p.rateLimit)) {
    return NextResponse.json({
      results: [],
      error: "rate_limit",
      message: "Spotify API 요청 한도 초과. 잠시 후 다시 시도해주세요.",
    });
  }

  const seen = new Set<string>();
  const results: {
    spotify_id: string;
    name: string;
    artist: string;
    cover_url: string;
    release_date: string;
  }[] = [];

  for (const { items } of pages) {
    for (const item of items as {
      id: string;
      name: string;
      artists: { name: string }[];
      images: { url: string }[];
      release_date: string;
    }[]) {
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
