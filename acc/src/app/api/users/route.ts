import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

// POST /api/users — 회원가입 시 users 프로필 생성
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { auth_id, username, display_name, emoji, onboarded } = body as {
    auth_id: string;
    username: string;
    display_name?: string;
    emoji?: string;
    onboarded?: boolean;
  };

  if (!auth_id || !username) {
    return NextResponse.json({ error: "auth_id, username 필수" }, { status: 400 });
  }

  // 기존 행 확인
  const { data: existing } = await supabaseServer
    .from("users")
    .select("id, auth_id, role")
    .eq("id", username)
    .single();

  if (existing) {
    // 이미 auth_id가 연결된 경우 → 다른 사람이 쓰는 username
    if (existing.auth_id) {
      return NextResponse.json({ error: "이미 사용 중인 username입니다" }, { status: 409 });
    }
    // auth_id 없는 기존 행 (기존 4명) → auth_id만 연결
    const { data, error } = await supabaseServer
      .from("users")
      .update({ auth_id })
      .eq("id", username)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, user: data });
  }

  // 신규 유저 → 새 행 삽입
  const { data, error } = await supabaseServer
    .from("users")
    .insert({
      id: username,
      display_name: display_name || username,
      emoji: emoji || "🎵",
      role: "user",
      auth_id,
      onboarded: onboarded ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: data });
}

// PATCH /api/users — 프로필 수정 (display_name, emoji, avatar_url, bio)
export async function PATCH(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { display_name, emoji, avatar_url, bio, onboarded } = body as {
    display_name?: string;
    emoji?: string;
    avatar_url?: string | null;
    bio?: string | null;
    onboarded?: boolean;
  };

  const updates: Record<string, string | boolean | null> = {};
  if (display_name !== undefined) updates.display_name = display_name;
  if (emoji !== undefined) updates.emoji = emoji;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  if (bio !== undefined) updates.bio = bio || null;
  if (onboarded !== undefined) updates.onboarded = onboarded;

  const { data, error } = await supabaseServer
    .from("users")
    .update(updates)
    .eq("id", authed.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (avatar_url !== undefined) revalidateTag("user-avatars", "max");
  if (display_name !== undefined || emoji !== undefined) revalidateTag("all-users", "max");
  return NextResponse.json({ ok: true, user: data });
}

// GET /api/users — 전체 유저 목록 반환 (authId 없을 때)
// GET /api/users?authId=xxx — 특정 유저 프로필 조회
export async function GET(req: NextRequest) {
  const authId = new URL(req.url).searchParams.get("authId");

  if (!authId) {
    const { data, error } = await supabaseServer
      .from("users")
      .select("id, display_name, emoji")
      .order("id");
    if (error) return NextResponse.json({ users: [] });
    return NextResponse.json({ users: data ?? [] });
  }

  const { data, error } = await supabaseServer
    .from("users")
    .select("id, display_name, emoji, role")
    .eq("auth_id", authId)
    .single();

  if (error) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: data });
}
