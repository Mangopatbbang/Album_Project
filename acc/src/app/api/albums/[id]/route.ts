import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import { logActivity } from "@/lib/activityLog";
import { validateAdmin } from "@/lib/validateAdmin";
import { validateUser } from "@/lib/validateUser";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authed = await validateAdmin(req);
  if (!authed) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const body = await req.json();
  const allowed = ["spotify_id", "cover_url", "tracklist", "title", "artist", "extra_artists", "year", "release_date", "genre", "region", "use_artist_variant"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "업데이트할 필드 없음" }, { status: 400 });
  }

  // artist 변경 시 새 아티스트의 use_artist_variant 설정 상속
  if ("artist" in update && !("use_artist_variant" in update)) {
    const newArtist = (update.artist as string).trim();
    const { data: sibling } = await supabaseServer
      .from("albums")
      .select("use_artist_variant")
      .ilike("artist", newArtist)
      .neq("id", id)
      .limit(1);
    if (sibling?.[0]?.use_artist_variant) {
      update.use_artist_variant = true;
    }
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
    .select("id, title, artist, tracklist, spotify_id, cover_url, genre, region, release_date");
  if (error) return NextResponse.json({ error: error.message, id, update }, { status: 500 });

  const updatedRow = updateData?.[0];
  const editMissing: string[] = [];
  if (!updatedRow?.cover_url) editMissing.push("커버");
  if (!updatedRow?.genre) editMissing.push("장르");
  if (!updatedRow?.region) editMissing.push("지역");
  if (!updatedRow?.release_date) editMissing.push("발매일");
  if (!updatedRow?.tracklist) editMissing.push("트랙리스트");

  await logActivity({
    userId: authed.id, action: "album_edit",
    albumId: id, albumTitle: updatedRow?.title, albumArtist: updatedRow?.artist,
    details: {
      updated_fields: Object.keys(update),
      ...(editMissing.length > 0 ? { missing: editMissing } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings", "max");
  revalidateTag("profile-ratings", "max");
  revalidateTag("albums-page-meta", "max");
  return NextResponse.json({ ok: true, tracklistSaved: !!update.tracklist, id, rowsUpdated: count, updatedRow: updateData });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, use_artist_variant, extra_artists, year, release_date, genre, region, cover_url, spotify_id, soundcloud_url, tracklist, added_by, ratings(user_id, score, one_line_review, liked_tracks, liked_by)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "앨범을 찾을 수 없습니다" }, { status: 404 });
  }

  const [resolved] = await resolveArtistDisplay([data]);
  const ratings = (data.ratings ?? []) as { user_id: string; score: number; one_line_review: string | null; liked_tracks: string | null }[];
  const scores = ratings.map((r) => r.score);
  const avg = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  // 리뷰어별 댓글 수
  const { data: commentRows } = await supabaseServer
    .from("comments")
    .select("reviewer_id")
    .eq("album_id", id);
  const commentCounts: Record<string, number> = {};
  for (const row of commentRows ?? []) {
    commentCounts[row.reviewer_id] = (commentCounts[row.reviewer_id] ?? 0) + 1;
  }

  return NextResponse.json({ ...resolved, ratings, avg, commentCounts }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { data: album } = await supabaseServer.from("albums").select("added_by, title, artist").eq("id", id).single();
  if (!album) return NextResponse.json({ error: "앨범 없음" }, { status: 404 });
  if (authed.role !== "admin" && album.added_by !== authed.id) return NextResponse.json({ error: "삭제 권한 없음" }, { status: 403 });

  const { error } = await supabaseServer.from("albums").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity({
    userId: authed.id, action: "album_delete",
    albumId: id, albumTitle: album.title, albumArtist: album.artist,
  });

  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings", "max");
  revalidateTag("profile-ratings", "max");
  revalidateTag("albums-page-meta", "max");
  return NextResponse.json({ ok: true });
}
