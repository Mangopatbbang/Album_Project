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

  if (reportId && status) {
    const { error } = await supabaseServer
      .from("reports")
      .update({ status })
      .eq("id", reportId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
