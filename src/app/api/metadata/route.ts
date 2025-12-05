import { NextResponse as NR } from "next/server";
import { supabaseServer as server } from "@/lib/supabaseServer";

const DISCOGS_BASE = "https://api.discogs.com";
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;

const DISCOGS_HEADERS: HeadersInit = {
  "User-Agent": "PalmanAlbum/1.0 +https://palmanalbum",
  Accept: "application/json",
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\[\]\(\)'".,!?·\-_/]/g, "");
}

type DiscogsSearchParams = Record<string, string>;

/** Discogs search endpoint 한 번 호출해서 results 배열만 리턴 */
async function discogsSearchOnce(params: DiscogsSearchParams) {
  if (!DISCOGS_TOKEN) {
    throw new Error("DISCOGS_TOKEN is missing");
  }

  const searchParams = new URLSearchParams({
    ...params,
    token: DISCOGS_TOKEN,
  });

  const url = `${DISCOGS_BASE}/database/search?${searchParams.toString()}`;

  const res = await fetch(url, {
    headers: DISCOGS_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    console.warn("Discogs search failed", res.status, url);
    return [];
  }

  const data = await res.json();
  return (data.results ?? []) as any[];
}

/** 결과들 중에서 우리 타이틀/아티스트에 가장 잘 맞는 후보 하나 고르기 (보수적으로) */
function pickBestDiscogsResultStrict(
  results: any[],
  title: string,
  artist: string
): any | null {
  if (!results.length) return null;

  const normTitle = normalize(title);
  const normArtist = normalize(artist);

  let best: any | null = null;
  let bestScore = -1;

  for (const r of results) {
    const rTitle = typeof r.title === "string" ? r.title : "";
    const rArtist = typeof r.artist === "string" ? r.artist : "";

    const nTitle = normalize(rTitle);
    const nArtist = normalize(rArtist);

    let score = 0;

    // 제목 일치도
    if (nTitle === normTitle) score += 60;
    else if (nTitle.includes(normTitle) || normTitle.includes(nTitle)) {
      score += 35;
    }

    // 아티스트 일치도
    if (nArtist === normArtist) score += 40;
    else if (nArtist.includes(normArtist) || normArtist.includes(nArtist)) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  // 둘 다 어느 정도 맞는 애만 채택 (threshold)
  if (bestScore >= 70) {
    return best;
  }
  return null;
}

/** Discogs에서 release 검색 (보수적 2단계 전략) */
async function searchDiscogsRelease(title: string, artist: string) {
  // 1단계: release_title + artist (정석)
  let results = await discogsSearchOnce({
    release_title: title,
    artist,
    type: "release",
    per_page: "10",
  });

  let best = pickBestDiscogsResultStrict(results, title, artist);
  if (best) return best;

  // 2단계: q = "title artist" 느슨 검색 한 번만
  results = await discogsSearchOnce({
    q: `${title} ${artist}`,
    type: "release",
    per_page: "10",
  });

  best = pickBestDiscogsResultStrict(results, title, artist);
  if (best) return best;

  // 그래도 없으면 그냥 못 찾은 걸로 처리
  return null;
}

/** Discogs release 상세 (트랙리스트/이미지/연도) */
async function fetchDiscogsReleaseDetail(releaseId: number) {
  if (!DISCOGS_TOKEN) {
    throw new Error("DISCOGS_TOKEN is missing");
  }

  const url = `${DISCOGS_BASE}/releases/${releaseId}?token=${DISCOGS_TOKEN}`;

  const res = await fetch(url, {
    headers: DISCOGS_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Discogs release detail failed: ${res.status}`);
  }

  const data = await res.json();

  const year: string | null =
    (data.year && String(data.year)) ||
    (data.released && String(data.released).slice(0, 4)) ||
    null;

  // 트랙리스트
  const tracks: string[] = Array.isArray(data.tracklist)
    ? data.tracklist
        .map((t: any) => (t?.title ?? "").toString().trim())
        .filter(Boolean)
    : [];

  // 이미지: primary > 첫 이미지 순
  let coverUrl: string | null = null;
  if (Array.isArray(data.images) && data.images.length > 0) {
    const primary =
      data.images.find((img: any) => img.type === "primary") || data.images[0];
    coverUrl =
      primary?.uri_https ||
      primary?.uri ||
      (typeof primary?.resource_url === "string"
        ? primary.resource_url
        : null);
  }

  const resolvedTitle: string | null = data.title ?? null;
  const resolvedArtist: string | null =
    Array.isArray(data.artists) && data.artists.length > 0
      ? data.artists[0]?.name ?? null
      : null;

  return {
    year,
    tracks,
    coverUrl,
    title: resolvedTitle,
    artist: resolvedArtist,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const albumId = searchParams.get("albumId");
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NR.json(
      { error: "Missing required query params: title, artist" },
      { status: 400 }
    );
  }

  try {
    if (!DISCOGS_TOKEN) {
      return NR.json(
        {
          error: "CONFIG_ERROR",
          message: "DISCOGS_TOKEN is not configured on the server",
        },
        { status: 500 }
      );
    }

    // 1) Supabase 캐시 우선
    if (albumId) {
      const { data, error } = await server
        .from("album_metadata")
        .select("*")
        .eq("album_id", albumId);

      if (!error && data && data.length > 0) {
        const row = data[0] as {
          album_id: string;
          mb_release_id: string | null; // 여기에는 discogs release id를 넣어둠
          cover_url: string | null;
          year: string | null;
          tracks: string[] | null;
          source: string | null;
        };

        return NR.json(
          {
            found: true,
            fromCache: true,
            discogsReleaseId: row.mb_release_id,
            source: row.source ?? "discogs",
            input: { title, artist },
            resolved: {
              title,
              artist,
              year: row.year ?? null,
              date: null,
            },
            tracks: row.tracks ?? [],
            coverUrl: row.cover_url ?? null,
          },
          { status: 200 }
        );
      }
    }

    // 2) Discogs 검색 (보수적)
    const searchResult = await searchDiscogsRelease(title, artist);

    if (!searchResult) {
      // Discogs에서 못 찾으면 그냥 NO_MATCH로
      return NR.json(
        {
          found: false,
          reason: "NO_MATCH",
          message: "Discogs에서 일치하는 앨범을 찾지 못했습니다.",
        },
        { status: 404 }
      );
    }

    const discogsReleaseId: number = searchResult.id;
    const detail = await fetchDiscogsReleaseDetail(discogsReleaseId);

    const year = detail.year;
    const tracks = detail.tracks;
    const coverUrl = detail.coverUrl;

    // 3) Supabase에 캐시 (albumId 있을 때만)
    if (albumId) {
      const { error: upsertError } = await server
        .from("album_metadata")
        .upsert(
          {
            album_id: albumId,
            mb_release_id: String(discogsReleaseId), // 열 이름은 mb_release_id지만 실제로는 discogs id 저장
            cover_url: coverUrl,
            year: year,
            tracks,
            source: "discogs",
          },
          { onConflict: "album_id" }
        );

      if (upsertError) {
        console.error("album_metadata upsert error:", upsertError);
      }
    }

    // 4) 최종 응답
    return NR.json(
      {
        found: true,
        fromCache: false,
        discogsReleaseId,
        source: "discogs",
        input: { title, artist },
        resolved: {
          title: detail.title ?? title,
          artist: detail.artist ?? artist,
          year: year,
          date: null,
        },
        tracks,
        coverUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/metadata (discogs strict) error:", err);
    return NR.json(
      {
        error: "INTERNAL_ERROR",
        message: err?.message ?? "Unknown error",
        cause: err?.cause ?? null,
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
