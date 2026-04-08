import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ["spotify_id", "cover_url", "tracklist", "title", "artist", "year", "release_date", "genre"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "업데이트할 필드 없음" }, { status: 400 });
  }

  // release_date가 제공되면 year 자동 동기화 (year가 별도로 지정되지 않은 경우)
  if ("release_date" in update && !("year" in update)) {
    const rd = update.release_date as string | null;
    update.year = rd ? rd.slice(0, 4) : null;
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

  const { data: updateData, error, count } = await supabaseServer
    .from("albums")
    .update(update)
    .eq("id", id)
    .select("id, tracklist, spotify_id");
  if (error) return NextResponse.json({ error: error.message, id, update }, { status: 500 });

  return NextResponse.json({ ok: true, tracklistSaved: !!update.tracklist, id, rowsUpdated: count, updatedRow: updateData });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, year, release_date, genre, cover_url, spotify_id, tracklist, added_by, ratings(user_id, score, one_line_review, liked_tracks)")
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

  return NextResponse.json({ ...data, ratings, avg }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId, role } = await req.json();

  if (!userId) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  // 권한 체크: admin은 모두 삭제 가능, user는 본인이 추가한 것만
  if (role !== "admin") {
    const { data: album } = await supabaseServer
      .from("albums")
      .select("added_by")
      .eq("id", id)
      .single();

    if (!album) return NextResponse.json({ error: "앨범 없음" }, { status: 404 });
    if (album.added_by !== userId) return NextResponse.json({ error: "삭제 권한 없음" }, { status: 403 });
  }

  const { error } = await supabaseServer.from("albums").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
