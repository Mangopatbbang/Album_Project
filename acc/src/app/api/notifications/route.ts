import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export type NotificationItem = {
  id: string;
  userId: string;
  type: "comment" | "like";
  fromUserId: string;
  albumId: string;
  reviewerId: string;
  read: boolean;
  createdAt: string;
};

// GET /api/notifications?userId=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) return NextResponse.json({ error: "userId 필수" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("notifications")
    .select("id, user_id, type, from_user_id, album_id, reviewer_id, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notifications: NotificationItem[] = (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    fromUserId: r.from_user_id,
    albumId: r.album_id,
    reviewerId: r.reviewer_id,
    read: r.read,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ notifications });
}

// PATCH /api/notifications
// body: { userId } — 전체 읽음 처리
// body: { id } — 단건 읽음 처리
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId, id } = body as { userId?: string; id?: string };

  if (id) {
    const { error } = await supabaseServer
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (userId) {
    const { error } = await supabaseServer
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "userId 또는 id 필수" }, { status: 400 });
}
