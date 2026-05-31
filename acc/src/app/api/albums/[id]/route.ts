import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { getAccessToken } from "@/lib/spotify";
import { resolveArtistDisplay, fetchAliasMap } from "@/lib/artistDisplay";
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
  const allowed = ["spotify_id", "cover_url", "tracklist", "track_durations", "title", "artist", "extra_artists", "release_date", "genre", "region", "use_artist_variant"];
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
        const tracks = td.items as { name: string; track_number: number; duration_ms: number }[];
        if (tracks?.length) {
          const sorted = tracks.sort((a, b) => a.track_number - b.track_number);
          update.tracklist = sorted.map((t) => t.name).join("; ");
          update.track_durations = sorted.map((t) => t.duration_ms).join("; ");
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

  const [albumResult] = await Promise.all([
    supabaseServer
      .from("albums")
      .select("id, title, artist, use_artist_variant, extra_artists, release_date, genre, region, cover_url, spotify_id, soundcloud_url, tracklist, track_durations, added_by, ratings(user_id, score, one_line_review, liked_tracks, liked_by)")
      .eq("id", id)
      .single(),
  ]);

  const { data, error } = albumResult;
  if (error || !data) {
    return NextResponse.json({ error: "앨범을 찾을 수 없습니다" }, { status: 404 });
  }

  const [resolved] = await resolveArtistDisplay([data]);

  // extra_artists 개별 이름도 alias 해상도 (fetchAliasMap은 캐시됨)
  const aliasMap = await fetchAliasMap();
  const extra_artists_display: string[] = resolved.extra_artists
    ? resolved.extra_artists.split(";").map((s: string) => {
        const t = s.trim();
        return aliasMap.get(t.toLowerCase()) ?? t;
      }).filter(Boolean)
    : [];

  const ratings = (data.ratings ?? []) as { user_id: string; score: number; one_line_review: string | null; liked_tracks: string | null }[];
  const scores = ratings.map((r) => r.score);
  const avg = scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;

  return NextResponse.json({ ...resolved, extra_artists_display, ratings, avg }, {
    headers: { "Cache-Control": "public, s-maxage=30" },
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
