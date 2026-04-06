import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

async function checkAdmin(userId: string) {
  const { data } = await supabaseServer.from("users").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { show_popup, userId } = await req.json();
  if (!await checkAdmin(userId ?? "")) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

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
  const { id } = await params;
  const { userId } = await req.json();
  if (!await checkAdmin(userId ?? "")) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { error } = await supabaseServer.from("announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
