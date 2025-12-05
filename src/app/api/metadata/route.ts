// app/api/metadata/route.ts
import { NextResponse as NR } from "next/server";
import { supabaseServer as server } from "@/lib/supabaseServer";

const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org/release";

const MB_HEADERS = {
  "User-Agent":
    "PalmanAlbum/1.0 (contact: your-email@example.com)", // 나중에 너 메일로 바꿔도 됨
};

/** title + artist로 MusicBrainz release 검색 */
async function searchRelease(title: string, artist: string) {
  const query = `release:"${title}" AND artist:"${artist}"`;
  const url =
    MB_BASE +
    `/release/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

  const res = await fetch(url, {
    headers: MB_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`MusicBrainz search failed: ${res.status}`);
  }

  const data = await res.json();
  const releases: any[] = data.releases ?? [];
  if (!releases.length) return null;

  // 앨범 타입 우선, 없으면 첫 번째 결과
  const albumType = releases.find(
    (r) => r["release-group"]?.["primary-type"] === "Album"
  );
  const best = albumType ?? releases[0];

  return best;
}

/** 특정 release(mbid)에 대해 트랙리스트 가져오기 */
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

  const date: string | undefined = data.date ?? data["first-release-date"];
  const year =
    typeof date === "string" && date.length >= 4 ? date.slice(0, 4) : undefined;

  const tracks: string[] = [];
  const media = (data.media ?? []) as any[];

  for (const disc of media) {
    const discTracks: any[] = disc.tracks ?? [];
    for (const t of discTracks) {
      const title = (t.title ?? "").toString().trim();
      if (title) tracks.push(title);
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

/** Cover Art Archive에서 커버 이미지 가져오기 (실패하면 null) */
async function fetchCoverUrl(mbid: string): Promise<string | null> {
  const url = `${CAA_BASE}/${encodeURIComponent(mbid)}`;

  try {
    const res = await fetch(url, {
      headers: MB_HEADERS,
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("CoverArtArchive non-ok:", res.status, url);
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
    console.error("fetchCoverUrl error:", err);
    return null;
  }
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
    // 1) Supabase 캐시 먼저 확인
    if (albumId) {
      const { data, error } = await server
        .from("album_metadata")
        .select("*")
        .eq("album_id", albumId);

      if (!error && data && data.length > 0) {
        const row = data[0] as {
          album_id: string;
          mb_release_id: string | null;
          cover_url: string | null;
          year: string | null;
          tracks: string[] | null;
          source: string | null;
        };

        return NR.json(
          {
            found: true,
            fromCache: true,
            mbReleaseId: row.mb_release_id,
            source: row.source ?? "musicbrainz",
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

    // 2) 캐시 없으면 MusicBrainz 검색
    const release = await searchRelease(title, artist);

    if (!release) {
      return NR.json(
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

    // 3) 트랙/연도 상세
    const detail = await fetchReleaseDetail(mbReleaseId);

    const year =
      detail.year ??
      (typeof releaseDate === "string" && releaseDate.length >= 4
        ? releaseDate.slice(0, 4)
        : undefined);

    const coverUrl = await fetchCoverUrl(mbReleaseId);
    const tracks = detail.tracks ?? [];

    // 4) Supabase에 캐싱 (albumId 있을 때만)
    if (albumId) {
      const { error: upsertError } = await server
        .from("album_metadata")
        .upsert(
          {
            album_id: albumId,
            mb_release_id: mbReleaseId,
            cover_url: coverUrl,
            year: year ?? null,
            tracks,
            source: "musicbrainz",
          },
          { onConflict: "album_id" } // unique index 맞춰서
        );

      if (upsertError) {
        console.error("album_metadata upsert error:", upsertError);
      }
    }

    // 5) 최종 응답
    return NR.json(
      {
        found: true,
        fromCache: false,
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
        tracks,
        coverUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/metadata error:", err);
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
