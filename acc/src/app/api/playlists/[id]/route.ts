import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const { data: playlist } = await supabaseServer
    .from("playlists")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!playlist || playlist.user_id !== authed.id) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { error } = await supabaseServer
    .from("playlists")
    .update({ title: title.trim() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath(`/playlist/${id}`);
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
