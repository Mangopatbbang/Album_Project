import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { id } = await params;
  const { show_popup } = await req.json();

  const { error } = await supabaseServer
    .from("announcements")
    .update({ show_popup })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { id } = await params;

  const { error } = await supabaseServer.from("announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
