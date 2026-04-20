import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export type CommentItem = {
  id: string;
  albumId: string;
  reviewerId: string;
  commenterId: string;
  content: string;
  createdAt: string;
};

// GET /api/comments?albumId=&reviewerId=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");
  const reviewerId = searchParams.get("reviewerId");

  if (!albumId || !reviewerId) {
    return NextResponse.json({ error: "albumId, reviewerId 필수" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("comments")
    .select("id, album_id, reviewer_id, commenter_id, content, created_at")
    .eq("album_id", albumId)
    .eq("reviewer_id", reviewerId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const comments: CommentItem[] = (data ?? []).map((r) => ({
    id: r.id,
    albumId: r.album_id,
    reviewerId: r.reviewer_id,
    commenterId: r.commenter_id,
    content: r.content,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ comments });
}

// POST /api/comments
// body: { albumId, reviewerId, commenterId, content }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { albumId, reviewerId, commenterId, content } = body as {
    albumId: string;
    reviewerId: string;
    commenterId: string;
    content: string;
  };

  if (!albumId || !reviewerId || !commenterId || !content?.trim()) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  if (content.length > 200) {
    return NextResponse.json({ error: "댓글은 200자 이하여야 합니다" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("comments")
    .insert({ album_id: albumId, reviewer_id: reviewerId, commenter_id: commenterId, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 자기 소감에 자기가 댓글 달면 알림 생성 안 함
  if (commenterId !== reviewerId) {
    await supabaseServer
      .from("notifications")
      .insert({
        user_id: reviewerId,
        type: "comment",
        from_user_id: commenterId,
        album_id: albumId,
        reviewer_id: reviewerId,
      });
  }

  return NextResponse.json({ ok: true, comment: data });
}
