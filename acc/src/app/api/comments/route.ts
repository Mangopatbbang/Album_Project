import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

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
// body: { albumId, reviewerId, content }
export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { albumId, reviewerId, content } = body as {
    albumId: string;
    reviewerId: string;
    content: string;
  };
  const commenterId = authed.id;

  if (!albumId || !reviewerId || !content?.trim()) {
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
