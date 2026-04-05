import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";

const BATCH_SIZE = 30;

export async function POST(req: NextRequest) {
  const { offset = 0 } = await req.json().catch(() => ({ offset: 0 }));

  // 전체 대상 수 (미완료만)
  const { count: remaining } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .not("spotify_id", "is", null)
    .is("release_date", null);

  // 배치 조회
  const { data: albums, error } = await supabaseServer
    .from("albums")
    .select("id, spotify_id, release_date")
    .not("spotify_id", "is", null)
    .is("release_date", null)
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!albums || albums.length === 0) {
    return NextResponse.json({ done: true, processed: 0, success: 0, failed: 0, remaining: 0, nextOffset: offset });
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return NextResponse.json({ error: `Spotify 토큰 발급 실패: ${String(e)}` }, { status: 500 });
  }

  let success = 0;
  let failed = 0;

  for (const album of albums) {
    let spotifyRes: Response | null = null;

    while (true) {
      try {
        spotifyRes = await fetch(
          `https://api.spotify.com/v1/albums/${album.spotify_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        failed++;
        break;
      }

      if (spotifyRes.status === 429) {
        const retryAfter = Number(spotifyRes.headers.get("Retry-After") ?? "5");
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        spotifyRes = null;
        continue;
      }

      if (!spotifyRes.ok) {
        failed++;
        spotifyRes = null;
        break;
      }

      break;
    }

    if (!spotifyRes) continue;

    const data = await spotifyRes.json();
    const release_date: string | null = data.release_date ?? null;
    if (!release_date) { failed++; continue; }

    const year = release_date.slice(0, 4);
    const { error: updateErr } = await supabaseServer
      .from("albums")
      .update({ release_date, year })
      .eq("id", album.id);

    if (updateErr) { failed++; } else { success++; }

    await new Promise((r) => setTimeout(r, 80));
  }

  const newRemaining = Math.max(0, (remaining ?? 0) - success);
  const done = newRemaining === 0;

  return NextResponse.json({
    done,
    processed: albums.length,
    success,
    failed,
    remaining: newRemaining,
    nextOffset: offset + albums.length,
  });
}
