import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export type RatingHistoryItem = {
  id: number;
  userId: string;
  albumId: string;
  score: number;
  createdAt: string;
};

// GET /api/rating-history?userId=&albumId=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId")?.trim();
  const albumId = searchParams.get("albumId")?.trim();

  if (!userId && !albumId) return NextResponse.json({ error: "userId 또는 albumId 필요" }, { status: 400 });

  let query = supabaseServer
    .from("rating_history")
    .select("id, user_id, album_id, score, created_at")
    .order("created_at", { ascending: true });

  if (userId) query = query.eq("user_id", userId);
  if (albumId) query = query.eq("album_id", albumId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items: RatingHistoryItem[] = (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    albumId: r.album_id,
    score: r.score,
    createdAt: r.created_at,
  }));

  return NextResponse.json(items, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
