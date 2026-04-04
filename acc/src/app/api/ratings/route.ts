import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { UserId } from "@/types";

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

  if (score < 1 || score > 8) {
    return NextResponse.json({ error: "score는 1~8 사이여야 합니다" }, { status: 400 });
  }

  if (one_line_review && one_line_review.length > 100) {
    return NextResponse.json({ error: "한줄평은 100자 이하여야 합니다" }, { status: 400 });
  }

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

  revalidatePath("/best");
  revalidateTag("profile-ratings", { expire: 0 }); // 프로필 통계 캐시 즉시 만료
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

  // 리뷰 좋아요 토글 (서버사이드 read-modify-write)
  if (reviewerId && likerId) {
    const { data: current } = await supabaseServer
      .from("ratings")
      .select("liked_by")
      .eq("album_id", albumId)
      .eq("user_id", reviewerId)
      .single();

    const likers = (current?.liked_by ?? "").split(",").filter(Boolean);
    const idx = likers.indexOf(likerId);
    if (idx >= 0) likers.splice(idx, 1);
    else likers.push(likerId);

    const newVal = likers.length > 0 ? likers.join(",") : null;
    const { error } = await supabaseServer
      .from("ratings")
      .update({ liked_by: newVal })
      .eq("album_id", albumId)
      .eq("user_id", reviewerId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  const { error } = await supabaseServer
    .from("ratings")
    .delete()
    .eq("album_id", albumId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("profile-ratings", { expire: 0 }); // 프로필 통계 캐시 즉시 만료
  return NextResponse.json({ ok: true });
}
