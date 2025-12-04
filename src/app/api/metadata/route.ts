// app/api/metadata/route.ts
import { NextRequest, NextResponse } from "next/server";

const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org/release";

// MusicBrainz에서 요구하는 형태로 User-Agent를 꼭 넣어주는 게 좋다.
// 실제 배포 시에는 너 이메일/도메인으로 바꿔줘.
const MB_HEADERS = {
  "User-Agent":
    "PalmanEumgamgyeong/1.0 (contact: your-email@example.com)",
};

/**
 * release 검색: title + artist로 MusicBrainz에서 release 후보 찾기
 */
async function searchRelease(title: string, artist: string) {
  const query = `release:"${title}" AND artist:"${artist}"`;
  const url =
    MB_BASE +
    `/release/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

  const res = await fetch(url, {
    headers: MB_HEADERS,
    // MusicBrainz QPS 부담 줄이려고 약간만 늘려둠
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`MusicBrainz search failed: ${res.status}`);
  }

  const data = await res.json();

  const releases: any[] = data.releases ?? [];
  if (!releases.length) {
    return null;
  }

  // 1순위: release-group primary-type이 "Album"인 것
  const albumType = releases.find(
    (r) => r["release-group"]?.["primary-type"] === "Album"
  );
  const best = albumType ?? releases[0];

  return best;
}

/**
 * 특정 release(mbid)에 대해 트랙리스트 가져오기
 */
async function fetchReleaseDetail(mbid: string) {
  const url =
    MB_BASE + `/release/${encodeURIComponent(mbid)}?inc=recordings&fmt=json`;

  const res = await fetch(url, {
    headers: MB_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`MusicBrainz release detail failed: ${res.status}`);
  }

  const data = await res.json();

  // 발매일/연도
  const date: string | undefined = data.date ?? data["first-release-date"];
  const year =
    typeof date === "string" && date.length >= 4 ? date.slice(0, 4) : undefined;

  // 트랙리스트(media[].tracks[].title)
  const tracks: string[] = [];
  const media = (data.media ?? []) as any[];

  for (const disc of media) {
    const discTracks: any[] = disc.tracks ?? [];
    for (const t of discTracks) {
      const title = (t.title ?? "").toString().trim();
      if (title) {
        tracks.push(title);
      }
    }
  }

  return {
    title: data.title as string | undefined,
    date,
    year,
    tracks,
    artistCredit: data["artist-credit"] ?? [],
  };
}

/**
 * Cover Art Archive에서 앨범 커버 URL 가져오기
 */
async function fetchCoverUrl(mbid: string): Promise<string | null> {
  const url = `${CAA_BASE}/${encodeURIComponent(mbid)}`;

  try {
    const res = await fetch(url, {
      headers: MB_HEADERS,
      cache: "no-store",
    });

    // 404 / 5xx / 기타 비정상 상태면 그냥 "커버 없음"으로 처리
    if (!res.ok) {
      console.warn("CoverArtArchive non-ok response:", res.status, url);
      return null;
    }

    let data: any;
    try {
      data = await res.json();
    } catch (e) {
      console.warn("CoverArtArchive JSON parse failed:", e);
      return null;
    }

    const images: any[] = data.images ?? [];
    if (!images.length) return null;

    const front = images.find((img) => img.front) ?? images[0];
    const imageUrl: string | undefined = front.image;

    return imageUrl ?? null;
  } catch (err) {
    // 여기로 오는 게 지금 네가 본 ECONNRESET 같은 케이스
    console.error("fetchCoverUrl error:", err);
    return null;
  }
}


/**
 * GET /api/metadata?title=...&artist=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json(
      { error: "Missing required query params: title, artist" },
      { status: 400 }
    );
  }

  try {
    // 1) release 검색
    const release = await searchRelease(title, artist);

    if (!release) {
      return NextResponse.json(
        {
          found: false,
          reason: "NO_MATCH",
          message: "MusicBrainz에서 일치하는 앨범을 찾지 못했습니다.",
        },
        { status: 404 }
      );
    }

    const mbReleaseId: string = release.id;
    const mbTitle: string = release.title;
    const releaseDate: string | undefined = release.date;
    const rg = release["release-group"];

    const ac: any[] = release["artist-credit"] ?? [];
    const firstArtistCredit = ac[0];
    const mbArtistName: string =
      (firstArtistCredit?.artist?.name as string | undefined) ??
      (firstArtistCredit?.name as string | undefined) ??
      artist;

    // 2) 트랙리스트/연도 상세
    const detail = await fetchReleaseDetail(mbReleaseId);

    const year =
      detail.year ??
      (typeof releaseDate === "string" && releaseDate.length >= 4
        ? releaseDate.slice(0, 4)
        : undefined);

    // 3) 커버 이미지
    const coverUrl = await fetchCoverUrl(mbReleaseId);

    return NextResponse.json(
      {
        found: true,
        mbReleaseId,
        mbReleaseGroupId: rg?.id ?? null,
        source: "musicbrainz",
        input: { title, artist },
        resolved: {
          title: detail.title ?? mbTitle,
          artist: mbArtistName,
          year: year ?? null,
          date: detail.date ?? releaseDate ?? null,
        },
        tracks: detail.tracks,
        coverUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    // 여기서 에러 상세를 콘솔에 최대한 뽑자
    console.error("GET /api/metadata error:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: err?.message ?? "Unknown error",
        // cause나 stack이 있으면 같이 내려주자 (개발용)
        cause: err?.cause ?? null,
      },
      { status: 500 }
    );
  }
}

// 이 두 줄을 파일 맨 아래에 추가해주는 것도 좋아
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
