import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);
  const action = searchParams.get("action");

  let q = supabaseServer
    .from("activity_logs")
    .select("id, created_at, user_id, action, album_id, album_title, album_artist, details")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) q = q.eq("action", action);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);

  const { error, count } = await supabaseServer
    .from("activity_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: count ?? 0 });
}
