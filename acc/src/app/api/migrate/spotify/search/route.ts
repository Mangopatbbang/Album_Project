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

  // 따옴표 등 Spotify 쿼리 파서를 깨는 문자 제거
  const clean = (s: string) => s.replace(/['"]/g, "").trim();
  const t = clean(title);
  const a = clean(artist);

  const queries = t
    ? [
        `album:${t}${a ? ` artist:${a}` : ""}`, // 필드 검색 (정확)
        a ? `${a} ${t}` : t,                      // 아티스트 우선 일반 검색
        `${t}${a ? ` ${a}` : ""}`,               // 제목 우선 일반 검색
        t,                                         // 제목만
      ]
    : [`artist:${a}`, a];

  const seen = new Set<string>();
  const results: {
    spotify_id: string;
    name: string;
    artist: string;
    extra_artists: string;
    cover_url: string;
    release_date: string;
  }[] = [];

  // market=KR 먼저, 결과 부족 시 market 없이 재시도
  for (const market of ["KR", ""]) {
    if (results.length >= 10) break;
    // KR에서 5개 이상 찾았으면 글로벌 재시도 생략
    if (market === "" && results.length >= 5) break;

    for (const q of queries) {
      if (results.length >= 10) break;
      try {
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=10${market ? `&market=${market}` : ""}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 429) {
          return NextResponse.json({
            results: [],
            error: "rate_limit",
            message: "Spotify API 요청 한도 초과. 잠시 후 다시 시도해주세요.",
          });
        }
        if (!res.ok) continue;
        const data = await res.json();
        for (const item of data.albums?.items ?? []) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          const allArtists: { name: string }[] = item.artists ?? [];
          results.push({
            spotify_id: item.id,
            name: item.name,
            artist: allArtists[0]?.name ?? "",
            extra_artists: allArtists.slice(1).map((ar) => ar.name).join("; "),
            cover_url: item.images?.[0]?.url ?? "",
            release_date: item.release_date ?? "",
          });
        }
      } catch {
        continue;
      }
    }
  }

  return NextResponse.json({ results });
}
