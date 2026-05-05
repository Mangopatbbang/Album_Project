import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { UserId } from "@/types";
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

  let query = supabaseServer
    .from("ratings")
    .select("id, album_id, user_id, score, one_line_review, created_at, updated_at");

  if (albumId) query = query.eq("album_id", albumId);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ratings: data ?? [] });
}

// POST /api/ratings
// body: { albumId, userId, score, one_line_review? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { albumId, userId, score, one_line_review } = body as {
    albumId: string;
    userId: UserId;
    score: number;
    one_line_review?: string;
  };

  if (!albumId || !userId || score == null) {
    return NextResponse.json({ error: "albumId, userId, score 필수" }, { status: 400 });
  }
  if (!(await validateUser(userId))) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  if (score < 1 || score > 8) {
    return NextResponse.json({ error: "score는 1~8 사이여야 합니다" }, { status: 400 });
  }

  if (one_line_review && one_line_review.length > 100) {
    return NextResponse.json({ error: "한줄평은 100자 이하여야 합니다" }, { status: 400 });
  }

  const [{ data: existing }, { data: albumData }] = await Promise.all([
    supabaseServer.from("ratings").select("score").eq("album_id", albumId).eq("user_id", userId).single(),
    supabaseServer.from("albums").select("title, artist").eq("id", albumId).single(),
  ]);
  const prevScore = existing?.score ?? null;

  const { data, error } = await supabaseServer
    .from("ratings")
    .upsert(
      { album_id: albumId, user_id: userId, score, one_line_review: one_line_review ?? null },
      { onConflict: "album_id,user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (prevScore !== score) {
    await supabaseServer
      .from("rating_history")
      .insert({ user_id: userId, album_id: albumId, score });
  }

  logActivity({
    userId, action: "rating_set",
    albumId, albumTitle: albumData?.title, albumArtist: albumData?.artist,
    details: { score, prev_score: prevScore },
  });

  revalidatePath("/");
  revalidatePath("/best");
  revalidateTag("profile-ratings", { expire: 0 });
  revalidateTag("all-albums-with-ratings", { expire: 0 });
  return NextResponse.json({ ok: true, rating: data });
}

// PATCH /api/ratings
// liked_tracks: { albumId, userId, liked_tracks }
// 리뷰 좋아요 토글: { albumId, reviewerId, likerId }
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { albumId, userId, liked_tracks, reviewerId, likerId } = body as {
    albumId: string;
    userId?: UserId;
    liked_tracks?: string | null;
    reviewerId?: string;
    likerId?: string;
  };

  if (!albumId) return NextResponse.json({ error: "albumId 필수" }, { status: 400 });
  const actorId = userId ?? likerId;
  if (!(await validateUser(actorId))) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  // liked_tracks 업데이트
  if (userId && liked_tracks !== undefined) {
    const { error } = await supabaseServer
      .from("ratings")
      .update({ liked_tracks })
      .eq("album_id", albumId)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // 리뷰 좋아요 토글 (optimistic locking — 동시 요청 충돌 방지)
  if (reviewerId && likerId) {
    let newVal: string | null = null;
    let isAdding = false;

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
      if (updated && updated.length > 0) break;
      // 동시 수정 감지 → 재시도
    }

    // 좋아요 추가 시 (취소가 아닐 때) + 자기 소감이 아닐 때 알림 생성
    if (isAdding && likerId !== reviewerId) {
      await supabaseServer
        .from("notifications")
        .insert({ user_id: reviewerId, type: "like", from_user_id: likerId, album_id: albumId, reviewer_id: reviewerId });
    }

    return NextResponse.json({ ok: true, liked_by: newVal });
  }

  return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
}

// DELETE /api/ratings
// body: { albumId, userId }
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { albumId, userId } = body as { albumId: string; userId: UserId };

  if (!albumId || !userId) {
    return NextResponse.json({ error: "albumId, userId 필수" }, { status: 400 });
  }
  if (!(await validateUser(userId))) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const [{ error }, { data: albumData }] = await Promise.all([
    supabaseServer.from("ratings").delete().eq("album_id", albumId).eq("user_id", userId),
    supabaseServer.from("albums").select("title, artist").eq("id", albumId).single(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logActivity({
    userId, action: "rating_delete",
    albumId, albumTitle: albumData?.title, albumArtist: albumData?.artist,
  });

  revalidatePath("/");
  revalidatePath("/best");
  revalidateTag("profile-ratings", { expire: 0 });
  revalidateTag("all-albums-with-ratings", { expire: 0 });
  return NextResponse.json({ ok: true });
}
