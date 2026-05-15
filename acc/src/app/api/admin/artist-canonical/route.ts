import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

// PATCH /api/admin/artist-canonical
// body: { album_id, artist }  — 앨범의 spotify 정식 아티스트명 변경 (admin 전용)
export async function PATCH(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { album_id, artist } = await req.json();
  if (!album_id || !artist?.trim()) {
    return NextResponse.json({ error: "album_id와 artist 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("albums")
    .update({ artist: artist.trim() })
    .eq("id", album_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings");
  revalidateTag("profile-ratings");
  return NextResponse.json({ ok: true });
}
