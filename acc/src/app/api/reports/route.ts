import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { reportedUserId, reason, detail } = await req.json();
  if (!reportedUserId || !reason) {
    return NextResponse.json({ error: "피신고자와 사유는 필수입니다" }, { status: 400 });
  }
  if (reportedUserId === authed.id) {
    return NextResponse.json({ error: "자신을 신고할 수 없습니다" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("reports")
    .insert({
      reporter_id: authed.id,
      reported_user_id: reportedUserId,
      reason,
      detail: detail?.trim() || null,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
