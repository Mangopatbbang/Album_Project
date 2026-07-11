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
    .select("id, album_id, reviewer_id, author_id, content, created_at")
    .eq("album_id", albumId)
    .eq("reviewer_id", reviewerId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const comments: CommentItem[] = (data ?? []).map((r) => ({
    id: r.id,
    albumId: r.album_id,
    reviewerId: r.reviewer_id,
    commenterId: r.author_id,
    content: r.content,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ comments });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  return NextResponse.json({ error: "댓글 기능이 비활성화됐습니다" }, { status: 410 });
}
