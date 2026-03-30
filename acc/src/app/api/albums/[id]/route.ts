import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ["spotify_id", "cover_url", "tracklist", "title", "artist", "year", "genre"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "업데이트할 필드 없음" }, { status: 400 });
  }

  // spotify_id가 새로 설정되고 tracklist가 없으면 자동으로 트랙리스트 가져오기
  if (update.spotify_id && !update.tracklist) {
    try {
      const token = await getAccessToken();
      const tr = await fetch(
        `https://api.spotify.com/v1/albums/${update.spotify_id}/tracks?limit=50&market=KR`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (tr.ok) {
        const td = await tr.json();
        const tracks = td.items as { name: string; track_number: number }[];
        if (tracks?.length) {
          update.tracklist = tracks
            .sort((a, b) => a.track_number - b.track_number)
            .map((t) => t.name)
            .join("; ");
        }
      }
    } catch {}
  }

  const { error } = await supabaseServer.from("albums").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, genre, cover_url, spotify_id, tracklist, ratings(user_id, score, one_line_review, liked_tracks)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "앨범을 찾을 수 없습니다" }, { status: 404 });
  }

  const ratings = (data.ratings ?? []) as { user_id: string; score: number; one_line_review: string | null; liked_tracks: string | null }[];
  const scores = ratings.map((r) => r.score);
  const avg = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  return NextResponse.json({ ...data, ratings, avg });
}
