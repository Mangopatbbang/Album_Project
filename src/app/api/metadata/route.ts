// app/api/metadata/route.ts
import { NextResponse as NR } from "next/server";
import { supabaseServer as server } from "@/lib/supabaseServer"; // <- 기존 ratings route.ts랑 동일하게 맞춰줘

const DISCOGS_BASE = "https://api.discogs.com";

const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
const DISCOGS_HEADERS: HeadersInit = {
  "User-Agent": "PalmanAlbum/1.0 +https://palmanalbum",
  Accept: "application/json",
};

if (!DISCOGS_TOKEN) {
  console.warn("[metadata] DISCOGS_TOKEN is not set in env");
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\[\]\(\)'".,!?·]/g, "");
}

type DiscogsSearchParams = Record<string, string>;

/** 실제로 Discogs search endpoint 한 번 호출해서 results 배열만 리턴 */
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

/** 결과들 중에서 우리 타이틀/아티스트에 가장 잘 맞는 후보 하나 고르기 */
function pickBestDiscogsResult(
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
    const rCountry = (r.country ?? "") as string;
    const rGenreArr: string[] = Array.isArray(r.genre) ? r.genre : [];
    const rStyleArr: string[] = Array.isArray(r.style) ? r.style : [];

    const nTitle = normalize(rTitle);
    const nArtist = normalize(rArtist);

    let score = 0;

    // 제목/아티스트 정확도
    if (nTitle === normTitle) score += 40;
    else if (nTitle.includes(normTitle) || normTitle.includes(nTitle)) score += 25;

    if (nArtist === normArtist) score += 30;
    else if (nArtist.includes(normArtist) || normArtist.includes(nArtist)) score += 15;

    // 한국 발매 우대
    const nCountry = rCountry.toLowerCase();
    if (
      nCountry === "korea" ||
      nCountry === "south korea" ||
      nCountry === "republic of korea"
    ) {
      score += 20;
    }

    // K-Pop / Hip Hop 같은 스타일 보너스
    const lowerGenres = rGenreArr.map((g) => g.toLowerCase());
    const lowerStyles = rStyleArr.map((s) => s.toLowerCase());

    if (
      lowerGenres.includes("k-pop") ||
      lowerStyles.includes("k-pop") ||
      lowerGenres.includes("hip hop") ||
      lowerStyles.includes("hip hop")
    ) {
      score += 10;
    }

    // 타입/포맷이 앨범/EP 계열이면 조금 가산점
    if (typeof r.format === "string") {
      const f = r.format.toLowerCase();
      if (f.includes("album") || f.includes("lp") || f.includes("ep")) {
        score += 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  return best;
}

/** Discogs에서 release 검색 (여러 전략 단계별 시도) */
async function searchDiscogsRelease(title: string, artist: string) {
  // 1단계: title + artist (가장 엄격)
  const strategies: DiscogsSearchParams[] = [
    {
      release_title: title,
      artist,
      type: "release",
      per_page: "10",
    },
    // 2단계: artist만 + 한국 우선
    {
      artist,
      type: "release",
      country: "Korea",
      per_page: "10",
    },
    // 3단계: title만
    {
      release_title: title,
      type: "release",
      per_page: "10",
    },
    // 4단계: q = "title artist" 느슨 검색
    {
      q: `${title} ${artist}`,
      type: "release",
      per_page: "10",
    },
  ];

  for (const params of strategies) {
    const results = await discogsSearchOnce(params);
    if (!results.length) continue;

    const best = pickBestDiscogsResult(results, title, artist);
    if (best) {
      return best;
    }
  }

  // 모든 전략 다 실패하면 null
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

  // 트랙리스트: "tracklist" 배열에서 title 추출
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
    // 0) 환경변수 체크
    if (!DISCOGS_TOKEN) {
      return NR.json(
        {
          error: "CONFIG_ERROR",
          message: "DISCOGS_TOKEN is not configured on the server",
        },
        { status: 500 }
      );
    }

    // 1) Supabase 캐시 먼저 확인
    if (albumId) {
      const { data, error } = await server
        .from("album_metadata")
        .select("*")
        .eq("album_id", albumId);

      if (!error && data && data.length > 0) {
        const row = data[0] as {
          album_id: string;
          mb_release_id: string | null; // 여기에는 discogs release id를 넣어둘거라 이름만 mb_인 상태
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

    // 2) 캐시 없으면 Discogs 검색
    const searchResult = await searchDiscogsRelease(title, artist);

    if (!searchResult) {
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

    // 3) Supabase에 캐싱 (albumId 있을 때만)
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
    console.error("GET /api/metadata (discogs) error:", err);
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

// Next.js / Vercel에서 외부 fetch 잘 되도록
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
