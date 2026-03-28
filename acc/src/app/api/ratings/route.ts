import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { UserId } from "@/types";

// GET /api/ratings?albumId=123
// GET /api/ratings?userId=arkyteccc
// GET /api/ratings?albumId=123&userId=arkyteccc
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");
  const userId = searchParams.get("userId");

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

  return NextResponse.json({ ok: true, rating: data });
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

  return NextResponse.json({ ok: true });
}
