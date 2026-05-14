import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

// GET /api/admin/artist-search-aliases?artist=xxx   → 특정 아티스트 alias 목록
// GET /api/admin/artist-search-aliases?all=true     → 전체 alias 목록 (id, spotify_name, alias)
export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const artist = req.nextUrl.searchParams.get("artist")?.trim();

  if (!artist) {
    if (req.nextUrl.searchParams.get("all") === "true") {
      const { data, error } = await supabaseServer
        .from("artist_search_aliases")
        .select("id, spotify_name, alias")
        .order("alias", { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ aliases: data ?? [] });
    }
    return NextResponse.json({ error: "artist 또는 all 파라미터 필수" }, { status: 400 });
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
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
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
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
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
