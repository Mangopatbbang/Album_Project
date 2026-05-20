import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";
import { validateAdmin } from "@/lib/validateAdmin";

export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { count } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .not("spotify_id", "is", null)
    .is("track_durations", null);

  return NextResponse.json({ remaining: count ?? 0 });
}

export async function POST(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { data: albums, error } = await supabaseServer
    .from("albums")
    .select("id, title, spotify_id")
    .not("spotify_id", "is", null)
    .is("track_durations", null)
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!albums?.length) {
    return NextResponse.json({ updated: 0, remaining: 0, done: true });
  }

  const token = await getAccessToken();
  let updated = 0;
  const errors: string[] = [];

  for (const album of albums) {
    const res = await fetch(
      `https://api.spotify.com/v1/albums/${album.spotify_id}/tracks?limit=50&market=KR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "10", 10);
      return NextResponse.json({
        updated,
        remaining: null,
        done: false,
        rateLimited: true,
        retryAfter,
        message: `Spotify 레이트 리밋 — ${retryAfter}초 후 재시도`,
      });
    }

    if (!res.ok) {
      errors.push(`"${album.title}" Spotify ${res.status}`);
      continue;
    }

    const data = await res.json();
    const tracks = (data.items ?? []) as { track_number: number; duration_ms: number }[];
    if (!tracks.length) {
      errors.push(`"${album.title}" 트랙 없음 (건너뜀)`);
      continue;
    }

    const sorted = tracks.sort((a, b) => a.track_number - b.track_number);
    const track_durations = sorted.map((t) => t.duration_ms).join("; ");
    const { error: upErr } = await supabaseServer
      .from("albums")
      .update({ track_durations })
      .eq("id", album.id);

    if (upErr) { errors.push(`"${album.title}" DB 오류: ${upErr.message}`); continue; }
    updated++;
  }

  const { count: remainingCount } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .not("spotify_id", "is", null)
    .is("track_durations", null);

  const remaining = remainingCount ?? 0;

  return NextResponse.json({
    updated,
    remaining,
    done: remaining === 0,
    errors: errors.length ? errors : undefined,
  });
}
