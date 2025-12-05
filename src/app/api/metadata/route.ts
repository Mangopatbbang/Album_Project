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

/** Discogs에서 release 검색 */
async function searchDiscogsRelease(title: string, artist: string) {
  if (!DISCOGS_TOKEN) {
    throw new Error("DISCOGS_TOKEN is missing");
  }

  const params = new URLSearchParams({
    release_title: title,
    artist,
    type: "release",
    token: DISCOGS_TOKEN,
    per_page: "5",
  });

  const url = `${DISCOGS_BASE}/database/search?${params.toString()}`;

  const res = await fetch(url, {
    headers: DISCOGS_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Discogs search failed: ${res.status}`);
  }

  const data = await res.json();
  const results: any[] = data.results ?? [];
  if (!results.length) return null;

  // 우선순위: 가장 정확해 보이는 첫 결과 (필요하면 정교화 가능)
  const best = results[0];
  return best;
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
