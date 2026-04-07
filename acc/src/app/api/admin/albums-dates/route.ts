import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// 발매일 비교용 전용 엔드포인트 — release_date 필드 포함
export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get("scope") ?? "2026";

  let query = supabaseServer
    .from("albums")
    .select("id, title, artist, release_date")
    .not("release_date", "is", null)
    .order("release_date", { ascending: false });

  if (scope === "2026") {
    query = query.gte("release_date", "2026-01-01");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
