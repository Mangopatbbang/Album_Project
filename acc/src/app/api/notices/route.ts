import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { content, show_popup } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("announcements")
    .insert({ content: content.trim(), show_popup: show_popup ?? false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
