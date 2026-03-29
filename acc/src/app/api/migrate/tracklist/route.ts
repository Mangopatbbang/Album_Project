import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";

const BATCH_SIZE = 5;
const DELAY_MS = 500;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const { offset = 0 } = await req.json().catch(() => ({}));

  // spotify_id 있고 tracklist 없는 앨범만
  const { data: albums, error } = await supabaseServer
    .from("albums")
    .select("id, spotify_id")
    .not("spotify_id", "is", null)
    .is("tracklist", null)
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!albums || albums.length === 0) {
    return NextResponse.json({ done: true, processed: 0, message: "트랙리스트 완료" });
  }

  const token = await getAccessToken();
  let success = 0;
  let failed = 0;
  let firstError: string | null = null;

  for (const album of albums) {
    await sleep(DELAY_MS);
    const res = await fetch(
      `https://api.spotify.com/v1/albums/${album.spotify_id}/tracks?limit=50&market=KR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.status === 429) {
      // rate limit → 즉시 반환해서 클라이언트가 대기 후 재시도
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "10", 10);
      return NextResponse.json({
        done: false,
        processed: success,
        success,
        failed,
        firstError: `429 rate limit — ${retryAfter}초 후 재시도`,
        retryAfter,
        remaining: null,
        nextOffset: offset,
      });
    }

    if (!res.ok) {
      const errText = `${res.status} ${res.statusText}`;
      console.error(`[tracklist] ${album.spotify_id} → ${errText}`);
      if (!firstError) firstError = `spotify_id=${album.spotify_id} → ${errText}`;
      failed++;
      continue;
    }

    const data = await res.json();
    const tracks = data.items as { name: string; track_number: number }[];
    if (!tracks?.length) { failed++; continue; }

    const tracklist = tracks
      .sort((a, b) => a.track_number - b.track_number)
      .map((t) => t.name)
      .join("; ");

    await supabaseServer.from("albums").update({ tracklist }).eq("id", album.id);
    success++;
  }

  const { count: remaining } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .not("spotify_id", "is", null)
    .is("tracklist", null);

  return NextResponse.json({
    done: remaining === 0,
    processed: albums.length,
    success,
    failed,
    firstError,
    remaining: remaining ?? 0,
    nextOffset: offset + BATCH_SIZE,
  });
}
