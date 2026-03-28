import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";

const BATCH_SIZE = 50;
const DELAY_MS = 250; // Spotify rate limit 대응

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchSpotifyAlbum(
  token: string,
  title: string,
  artist: string
): Promise<{ spotify_id: string; cover_url: string } | null> {
  // 시도 1: 엄격한 검색
  // 시도 2: 제목+아티스트 자유 검색
  // 시도 3: 제목만
  const queries = [
    `album:${title} artist:${artist}`,
    `${title} ${artist}`,
    `${title}`,
  ];

  for (const q of queries) {
    await sleep(100);
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=3&market=KR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) continue;

    const data = await res.json();
    const items = data.albums?.items ?? [];
    if (items.length === 0) continue;

    // 아티스트 이름이 포함된 결과 우선, 없으면 첫 번째 결과
    const matched =
      items.find((item: { artists: { name: string }[] }) =>
        item.artists?.some((a: { name: string }) =>
          a.name.toLowerCase().includes(artist.toLowerCase().slice(0, 3))
        )
      ) ?? items[0];

    if (!matched) continue;

    return {
      spotify_id: matched.id,
      cover_url: matched.images?.[0]?.url ?? "",
    };
  }

  return null;
}

async function fetchTracklist(token: string, spotifyId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.spotify.com/v1/albums/${spotifyId}/tracks?limit=50&market=KR`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const tracks = data.items as { name: string; track_number: number }[];
  if (!tracks?.length) return null;

  return tracks
    .sort((a, b) => a.track_number - b.track_number)
    .map((t) => t.name)
    .join("; ");
}

export async function POST(req: NextRequest) {
  const { offset = 0 } = await req.json().catch(() => ({}));

  // 아직 spotify_id 없는 앨범만 처리
  const { data: albums, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist")
    .is("spotify_id", null)
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!albums || albums.length === 0) {
    return NextResponse.json({ done: true, processed: 0, message: "모든 앨범 처리 완료" });
  }

  const token = await getAccessToken();
  let success = 0;
  let notFound = 0;

  for (const album of albums) {
    await sleep(DELAY_MS);

    const result = await searchSpotifyAlbum(token, album.title, album.artist);

    if (!result) {
      notFound++;
      continue;
    }

    // 트랙리스트 가져오기
    await sleep(DELAY_MS);
    const tracklist = await fetchTracklist(token, result.spotify_id);

    await supabaseServer
      .from("albums")
      .update({
        spotify_id: result.spotify_id,
        cover_url: result.cover_url,
        tracklist: tracklist ?? null,
      })
      .eq("id", album.id);

    success++;
  }

  // 남은 앨범 수 확인
  const { count: remaining } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .is("spotify_id", null);

  return NextResponse.json({
    done: remaining === 0,
    processed: albums.length,
    success,
    notFound,
    remaining: remaining ?? 0,
    nextOffset: offset + BATCH_SIZE,
  });
}
