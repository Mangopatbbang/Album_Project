import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "missing userId" }, { status: 400 });

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabaseServer.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabaseServer.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  let isFollowing = false;
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    const { data: { user } } = await supabaseServer.auth.getUser(token);
    if (user && user.id !== userId) {
      const { data } = await supabaseServer
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      isFollowing = !!data;
    }
  }

  return NextResponse.json({
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    isFollowing,
  });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { targetId } = await req.json();
  if (!targetId) return NextResponse.json({ error: "missing targetId" }, { status: 400 });
  if (user.id === targetId) return NextResponse.json({ error: "cannot follow self" }, { status: 400 });

  const { error } = await supabaseServer
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const targetId = req.nextUrl.searchParams.get("targetId");
  if (!targetId) return NextResponse.json({ error: "missing targetId" }, { status: 400 });

  const { error } = await supabaseServer
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
