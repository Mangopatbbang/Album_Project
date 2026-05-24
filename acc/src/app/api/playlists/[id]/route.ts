import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, is_public } = body;

  if (title !== undefined && !title?.trim()) {
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

  const updates: Record<string, string | boolean> = {};
  if (title !== undefined) updates.title = title.trim();
  if (is_public !== undefined) updates.is_public = is_public;

  const { error } = await supabaseServer
    .from("playlists")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath(`/playlist/${id}`);
  revalidatePath("/");
  revalidateTag("user-playlists", "max");

  return NextResponse.json({ ok: true });
}
