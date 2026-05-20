import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";
import { validateAdmin } from "@/lib/validateAdmin";

export async function POST(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { data: albums, error } = await supabaseServer
    .from("albums")
    .select("id, spotify_id")
    .not("spotify_id", "is", null)
    .is("track_durations", null)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!albums?.length) return NextResponse.json({ updated: 0, message: "백필 완료 — 미처리 항목 없음" });

  const token = await getAccessToken();
  let updated = 0;
  const errors: string[] = [];

  for (const album of albums) {
    try {
      const res = await fetch(
        `https://api.spotify.com/v1/albums/${album.spotify_id}/tracks?limit=50&market=KR`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { errors.push(`${album.id}: Spotify ${res.status}`); continue; }
      const data = await res.json();
      const tracks = (data.items ?? []) as { track_number: number; duration_ms: number }[];
      if (!tracks.length) continue;
      const sorted = tracks.sort((a, b) => a.track_number - b.track_number);
      const track_durations = sorted.map((t) => t.duration_ms).join("; ");
      const { error: upErr } = await supabaseServer
        .from("albums")
        .update({ track_durations })
        .eq("id", album.id);
      if (upErr) { errors.push(`${album.id}: ${upErr.message}`); continue; }
      updated++;
    } catch (e) {
      errors.push(`${album.id}: ${String(e)}`);
    }
  }

  return NextResponse.json({ updated, remaining: albums.length - updated, errors: errors.length ? errors : undefined });
}
