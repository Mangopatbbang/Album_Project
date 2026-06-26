import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { logActivity } from "@/lib/activityLog";
import { validateUser } from "@/lib/validateUser";

// GET /api/ratings?albumId=123
// GET /api/ratings?userId=arkyteccc
// GET /api/ratings?albumId=123&userId=arkyteccc
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");
  const userId = searchParams.get("userId");

  if (!albumId && !userId) {
    return NextResponse.json({ error: "albumId 또는 userId 필수" }, { status: 400 });
  }

  // private_note는 본인 인증 시에만 포함
  const authed = await validateUser(req);
  const isOwnRequest = authed && userId && authed.id === userId;
  const selectCols = isOwnRequest
    ? "id, album_id, user_id, score, one_line_review, private_note, created_at, updated_at"
    : "id, album_id, user_id, score, one_line_review, created_at, updated_at";

  let query = supabaseServer
    .from("ratings")
    .select(selectCols);

  if (albumId) query = query.eq("album_id", albumId);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ratings: data ?? [] });
}

// POST /api/ratings
// body: { albumId, score, one_line_review? }
export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { albumId, score, one_line_review, is_encounter, discovery_source, private_note } = body as {
    albumId: string;
    score: number;
    one_line_review?: string;
    is_encounter?: boolean;
    discovery_source?: string;
    private_note?: string;
  };
  const userId = authed.id;

  if (!albumId || score == null) {
    return NextResponse.json({ error: "albumId, score 필수" }, { status: 400 });
  }

  if (score < 1 || score > 8) {
    return NextResponse.json({ error: "score는 1~8 사이여야 합니다" }, { status: 400 });
  }

  if (one_line_review && one_line_review.length > 100) {
    return NextResponse.json({ error: "한줄평은 100자 이하여야 합니다" }, { status: 400 });
  }

  if (private_note && private_note.length > 500) {
    return NextResponse.json({ error: "메모는 500자 이하여야 합니다" }, { status: 400 });
  }

  const [{ data: existing }, { data: albumData }] = await Promise.all([
    supabaseServer.from("ratings").select("score, one_line_review").eq("album_id", albumId).eq("user_id", userId).single(),
    supabaseServer.from("albums").select("title, artist").eq("id", albumId).single(),
  ]);
  const prevScore = existing?.score ?? null;

  // 8점 상한 체크 (12장) — 새로 8점을 주는 경우에만
  if (score === 8 && prevScore !== 8) {
    const { data: hofRatings } = await supabaseServer
      .from("ratings")
      .select("album_id, updated_at, albums(id, title, artist, cover_url)")
      .eq("user_id", userId)
      .eq("score", 8);

    if ((hofRatings ?? []).length >= 12) {
      const albums = (hofRatings ?? []).map((r) => {
        const a = (r.albums as unknown) as { id: string; title: string; artist: string; cover_url: string | null } | null;
        return {
          id: a?.id ?? (r.album_id as string),
          title: a?.title ?? "",
          artist: a?.artist ?? "",
          cover_url: a?.cover_url ?? null,
          updatedAt: r.updated_at as string,
        };
      });
      return NextResponse.json({ code: "HOF_LIMIT_REACHED", error: "명반전이 가득 찼어요 (최대 12장)", albums }, { status: 409 });
    }
  }

  const upsertData: {
    album_id: string;
    user_id: string;
    score: number;
    one_line_review: string | null;
    private_note?: string | null;
    encounter_date?: string;
    discovery_source?: string;
  } = { album_id: albumId, user_id: userId, score, one_line_review: one_line_review ?? null };
  if (is_encounter) {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    upsertData.encounter_date = kst.toISOString().slice(0, 10);
  }
  // 첫 평가일 때만 기록 — 재평가 시 덮어쓰지 않음
  if (prevScore === null && discovery_source) {
    upsertData.discovery_source = discovery_source;
  }
  // private_note는 재평가 시에도 덮어쓰기 허용
  if (private_note !== undefined) {
    upsertData.private_note = private_note || null;
  }

  const { data, error } = await supabaseServer
    .from("ratings")
    .upsert(upsertData, { onConflict: "album_id,user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 점수 or 한줄소감 변경 시 이전 값 기록
  const prevReview = existing ? (existing as { score: number; one_line_review?: string | null }).one_line_review ?? null : null;
  const reviewChanged = (one_line_review ?? null) !== prevReview;
  if (prevScore !== null && (prevScore !== score || reviewChanged)) {
    await supabaseServer.from("rating_history").insert({
      user_id: userId, album_id: albumId,
      old_score: prevScore, new_score: score,
      old_review: prevReview, new_review: one_line_review ?? null,
    });
  }

  await logActivity({
    userId, action: "rating_set",
    albumId, albumTitle: albumData?.title, albumArtist: albumData?.artist,
    details: { score, prev_score: prevScore },
  });

  revalidatePath("/");
  revalidatePath("/best");
  revalidateTag("profile-ratings", "max");
  revalidateTag("user-genre-emojis", "max");
  revalidateTag("community-ratings", "max");
  revalidateTag("profile-comparison", "max");
  revalidateTag("all-albums-with-ratings", "max");
  revalidateTag("controversial", "max");
  return NextResponse.json({ ok: true, rating: data });
}

// PATCH /api/ratings
// liked_tracks: { albumId, liked_tracks }
// 리뷰 좋아요 토글: { albumId, reviewerId }
export async function PATCH(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { albumId, liked_tracks, reviewerId } = body as {
    albumId: string;
    liked_tracks?: string | null;
    reviewerId?: string;
  };
  const actorId = authed.id;

  if (!albumId) return NextResponse.json({ error: "albumId 필수" }, { status: 400 });

  // liked_tracks 업데이트
  if (liked_tracks !== undefined && !reviewerId) {
    const { error } = await supabaseServer
      .from("ratings")
      .update({ liked_tracks })
      .eq("album_id", albumId)
      .eq("user_id", actorId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateTag("profile-ratings", "max");
    return NextResponse.json({ ok: true });
  }

  // 리뷰 좋아요 토글 (optimistic locking — 동시 요청 충돌 방지)
  if (reviewerId) {
    const likerId = actorId;
    let newVal: string | null = null;
    let isAdding = false;
    let succeeded = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: current } = await supabaseServer
        .from("ratings")
        .select("liked_by")
        .eq("album_id", albumId)
        .eq("user_id", reviewerId)
        .single();

      const oldVal = current?.liked_by ?? null;
      const likers = (oldVal ?? "").split(",").filter(Boolean);
      const idx = likers.indexOf(likerId);
      if (idx >= 0) likers.splice(idx, 1);
      else likers.push(likerId);
      newVal = likers.length > 0 ? likers.join(",") : null;
      isAdding = idx < 0;

      const base = supabaseServer
        .from("ratings")
        .update({ liked_by: newVal })
        .eq("album_id", albumId)
        .eq("user_id", reviewerId);

      const { data: updated, error } = await (
        oldVal !== null ? base.eq("liked_by", oldVal) : base.is("liked_by", null)
      ).select("id");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (updated && updated.length > 0) { succeeded = true; break; }
    }

    if (!succeeded) return NextResponse.json({ error: "업데이트 충돌이 발생했습니다. 다시 시도해주세요." }, { status: 409 });

    if (isAdding && likerId !== reviewerId) {
      await supabaseServer
        .from("notifications")
        .insert({ user_id: reviewerId, type: "like", from_user_id: likerId, album_id: albumId, reviewer_id: reviewerId });
    }

    revalidateTag("profile-ratings", "max");
    return NextResponse.json({ ok: true, liked_by: newVal });
  }

  return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
}

// DELETE /api/ratings
// body: { albumId }
export async function DELETE(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { albumId } = body as { albumId: string };
  const userId = authed.id;

  if (!albumId) {
    return NextResponse.json({ error: "albumId 필수" }, { status: 400 });
  }

  const [{ data: deletedRating }, { data: albumData }] = await Promise.all([
    supabaseServer.from("ratings").select("score, one_line_review").eq("album_id", albumId).eq("user_id", userId).single(),
    supabaseServer.from("albums").select("title, artist").eq("id", albumId).single(),
  ]);

  const { error } = await supabaseServer.from("ratings").delete().eq("album_id", albumId).eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (deletedRating) {
    await supabaseServer.from("rating_history").insert({
      user_id: userId, album_id: albumId,
      old_score: deletedRating.score, new_score: null,
      old_review: (deletedRating as { score: number; one_line_review?: string | null }).one_line_review ?? null,
      new_review: null,
    });
  }

  await logActivity({
    userId, action: "rating_delete",
    albumId, albumTitle: albumData?.title, albumArtist: albumData?.artist,
  });

  revalidatePath("/");
  revalidatePath("/best");
  revalidateTag("profile-ratings", "max");
  revalidateTag("user-genre-emojis", "max");
  revalidateTag("community-ratings", "max");
  revalidateTag("profile-comparison", "max");
  revalidateTag("all-albums-with-ratings", "max");
  revalidateTag("controversial", "max");
  return NextResponse.json({ ok: true });
}
