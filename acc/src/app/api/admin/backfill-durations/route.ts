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
    .select("id, spotify_id")
    .not("spotify_id", "is", null)
    .is("track_durations", null)
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!albums?.length) {
    return NextResponse.json({ updated: 0, remaining: 0, done: true });
  }

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
