import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { albumId, detail } = await req.json();
  if (!albumId || !detail?.trim()) {
    return NextResponse.json({ error: "앨범 ID와 오류 내용은 필수입니다" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("reports")
    .insert({
      reporter_id: authed.id,
      reported_user_id: null,
      reason: "앨범 정보 오류",
      detail: `[album:${albumId}] ${detail.trim()}`,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
