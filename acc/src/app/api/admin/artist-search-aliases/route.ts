import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

// GET /api/admin/artist-search-aliases?artist=xxx
// → { aliases: { id: number; alias: string }[] }
export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const artist = req.nextUrl.searchParams.get("artist")?.trim();
  if (!artist) {
    return NextResponse.json({ error: "artist 파라미터 필수" }, { status: 400 });
  }
  const { data, error } = await supabaseServer
    .from("artist_search_aliases")
    .select("id, alias")
    .eq("spotify_name", artist)
    .order("alias", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ aliases: data ?? [] });
}

// POST /api/admin/artist-search-aliases
// body: { spotify_name, alias }
export async function POST(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { spotify_name, alias } = await req.json();
  if (!spotify_name?.trim() || !alias?.trim()) {
    return NextResponse.json({ error: "spotify_name과 alias 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("artist_search_aliases")
    .insert({ spotify_name: spotify_name.trim(), alias: alias.trim() });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 존재하는 alias입니다" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/artist-search-aliases
// body: { id }
export async function DELETE(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("artist_search_aliases")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
