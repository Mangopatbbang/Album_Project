import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";
import { validateUser } from "@/lib/validateUser";
import { spotifyLimiter, getIP, checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  // 앨범 입고·수정(AlbumAddModal/AlbumEditModal)에서 일반 유저도 사용 — admin 전용 아님
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const limited = await checkRateLimit(spotifyLimiter, getIP(req));
  if (limited) return limited;

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
        `album:${t}${a ? ` artist:${a}` : ""}`,
        `${t}${a ? ` ${a}` : ""}`,
        t,
        ...(a ? [`artist:${a}`] : []),
      ]
    : [
        `artist:${a}`,
        a,
      ];

  const seen = new Set<string>();
  const results: {
    spotify_id: string;
    name: string;
    artist: string;
    extra_artists: string;
    cover_url: string;
    release_date: string;
  }[] = [];

  for (const q of queries) {
    if (results.length >= 30) break;
    try {
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=10&market=KR`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

  return NextResponse.json({ results });
}
