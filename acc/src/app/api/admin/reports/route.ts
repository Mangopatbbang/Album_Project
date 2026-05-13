import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateUser";

export type ReportAction = "dismiss" | "warn" | "ban_7d" | "ban_14d" | "ban_permanent";

// status는 pending | dismissed | warned | banned_7d | banned_14d | banned
function actionToStatus(action: ReportAction) {
  const map: Record<ReportAction, string> = {
    dismiss: "dismissed",
    warn: "warned",
    ban_7d: "banned_7d",
    ban_14d: "banned_14d",
    ban_permanent: "banned",
  };
  return map[action];
}

export async function GET(req: NextRequest) {
  const authed = await validateAdmin(req);
  if (!authed) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const statusFilter = new URL(req.url).searchParams.get("status");
  let query = supabaseServer
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const authed = await validateAdmin(req);
  if (!authed) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { reportId, action, unbanUserId } = await req.json() as {
    reportId?: string;
    action?: ReportAction;
    unbanUserId?: string;
  };

  // 밴 해제
  if (unbanUserId) {
    const { error } = await supabaseServer
      .from("users")
      .update({ banned_at: null, ban_until: null })
      .eq("id", unbanUserId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!reportId || !action) {
    return NextResponse.json({ error: "reportId, action 필수" }, { status: 400 });
  }

  // 신고 정보 조회
  const { data: report } = await supabaseServer
    .from("reports")
    .select("reporter_id, reported_user_id")
    .eq("id", reportId)
    .single();
  if (!report) return NextResponse.json({ error: "신고를 찾을 수 없습니다" }, { status: 404 });

  const newStatus = actionToStatus(action);

  // 신고 상태 업데이트
  const { error: statusErr } = await supabaseServer
    .from("reports")
    .update({ status: newStatus })
    .eq("id", reportId);
  if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 500 });

  // 밴 처리
  if (action === "ban_7d" || action === "ban_14d" || action === "ban_permanent") {
    const days = action === "ban_7d" ? 7 : action === "ban_14d" ? 14 : null;
    const ban_until = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    const { error: banErr } = await supabaseServer
      .from("users")
      .update({ banned_at: new Date().toISOString(), ban_until })
      .eq("id", report.reported_user_id);
    if (banErr) return NextResponse.json({ error: banErr.message }, { status: 500 });
  }

  // 기각이 아닌 경우 → 신고자에게 알림
  if (action !== "dismiss") {
    const reporterNotifType = (action === "ban_7d" || action === "ban_14d" || action === "ban_permanent")
      ? "report_ban" : "report_reviewed";
    try {
      await supabaseServer.from("notifications").insert({
        user_id: report.reporter_id,
        type: reporterNotifType,
        from_user_id: null,
        album_id: null,
        reviewer_id: report.reported_user_id,
      });
    } catch { /* ignore */ }
  }

  // 경고/밴 → 피신고자에게도 알림
  if (action === "warn") {
    try {
      await supabaseServer.from("notifications").insert({
        user_id: report.reported_user_id,
        type: "moderation_warning",
        from_user_id: null,
        album_id: null,
        reviewer_id: null,
      });
    } catch { /* ignore */ }
  } else if (action === "ban_7d" || action === "ban_14d" || action === "ban_permanent") {
    const banType = action === "ban_permanent" ? "moderation_ban_permanent" : "moderation_ban_temp";
    const days = action === "ban_7d" ? 7 : action === "ban_14d" ? 14 : null;
    try {
      await supabaseServer.from("notifications").insert({
        user_id: report.reported_user_id,
        type: banType,
        from_user_id: null,
        album_id: null,
        // ban_until 일수를 reviewer_id 대신 쓰기 어려워 일수를 type에서 구분
        reviewer_id: days ? String(days) : null,
      });
    } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true });
}
