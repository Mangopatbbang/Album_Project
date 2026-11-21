import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";
import { validateUser } from "@/lib/validateUser";
import { formLimiter, getIP, checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { data, error } = await supabaseServer
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(formLimiter, getIP(req));
  if (limited) return limited;
  // 문의 작성은 로그인 필수 (게시판 화면과 동일 정책) — 작성자 id는 토큰 기준, 클라이언트 값 무시(사칭 방지)
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 후 문의를 남길 수 있어요" }, { status: 401 });

  const { content, author_name, category } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("inquiries")
    .insert({
      content: content.trim(),
      author_id: authed.id,
      author_name: author_name?.trim() || null,
      category: category?.trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
