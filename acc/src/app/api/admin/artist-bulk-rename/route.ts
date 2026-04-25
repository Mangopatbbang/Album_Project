import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";

// GET /api/admin/artist-bulk-rename?from=xxx
// → { count: number } 미리보기용
export async function GET(req: NextRequest) {
  const from = new URL(req.url).searchParams.get("from")?.trim();
  if (!from) return NextResponse.json({ count: 0 });
  const { count, error } = await supabaseServer
    .from("albums")
    .select("id", { count: "exact", head: true })
    .eq("artist", from);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: count ?? 0 });
}

// POST /api/admin/artist-bulk-rename
// body: { from: string, to: string }
// → 해당 아티스트명을 가진 앨범 전체 일괄 변경
export async function POST(req: NextRequest) {
  const { from, to } = await req.json();
  if (!from?.trim() || !to?.trim()) {
    return NextResponse.json({ error: "from과 to 필수" }, { status: 400 });
  }
  if (from.trim() === to.trim()) {
    return NextResponse.json({ error: "from과 to가 동일합니다" }, { status: 400 });
  }

  const { data: updated, error } = await supabaseServer
    .from("albums")
    .update({ artist: to.trim() })
    .eq("artist", from.trim())
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings", { expire: 0 });
  revalidateTag("profile-ratings", { expire: 0 });

  return NextResponse.json({ ok: true, renamed: updated?.length ?? 0 });
}
