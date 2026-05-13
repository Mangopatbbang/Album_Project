import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateUser";

export async function GET(req: NextRequest) {
  const authed = await validateAdmin(req);
  if (!authed) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const statusFilter = new URL(req.url).searchParams.get("status");
  let query = supabaseServer
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

// PATCH: 신고 상태 변경 및/또는 유저 밴
export async function PATCH(req: NextRequest) {
  const authed = await validateAdmin(req);
  if (!authed) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { reportId, status, banUserId, unbanUserId } = await req.json();

  // 신고 상태 업데이트 + 알림 발송 (reviewed일 때만)
  if (reportId && status) {
    const { error } = await supabaseServer
      .from("reports")
      .update({ status })
      .eq("id", reportId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // reviewed(확인 처리) 상태일 때만 신고자에게 알림
    if (status === "reviewed") {
      const { data: report } = await supabaseServer
        .from("reports")
        .select("reporter_id, reported_user_id")
        .eq("id", reportId)
        .single();

      if (report) {
        const notifType = banUserId ? "report_ban" : "report_reviewed";
        // 알림 실패해도 메인 액션은 성공으로 처리
        try {
          await supabaseServer.from("notifications").insert({
            user_id: report.reporter_id,
            type: notifType,
            from_user_id: null,
            album_id: null,
            reviewer_id: report.reported_user_id,
          });
        } catch { /* ignore */ }
      }
    }
  }

  if (banUserId) {
    const { error } = await supabaseServer
      .from("users")
      .update({ banned_at: new Date().toISOString() })
      .eq("id", banUserId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (unbanUserId) {
    const { error } = await supabaseServer
      .from("users")
      .update({ banned_at: null })
      .eq("id", unbanUserId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
