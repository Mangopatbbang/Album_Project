import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// GET /api/admin/artist-aliases
// - ?artist=xxx  → 특정 아티스트 alias 조회 { alias: { spotify_name, variant_name } | null }
// - (no param)   → 전체 alias 목록 반환 { aliases: { spotify_name, variant_name }[] }
export async function GET(req: NextRequest) {
  const artist = new URL(req.url).searchParams.get("artist")?.trim();

  if (artist) {
    const { data, error } = await supabaseServer
      .from("artist_aliases")
      .select("spotify_name, variant_name")
      .eq("spotify_name", artist)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ alias: data ?? null });
  }

  const { data, error } = await supabaseServer
    .from("artist_aliases")
    .select("spotify_name, variant_name")
    .order("spotify_name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ aliases: data ?? [] });
}

// POST /api/admin/artist-aliases
// body: { spotify_name, variant_name }
// → upsert alias
export async function POST(req: NextRequest) {
  const { spotify_name, variant_name } = await req.json();
  if (!spotify_name?.trim() || !variant_name?.trim()) {
    return NextResponse.json({ error: "spotify_name과 variant_name 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("artist_aliases")
    .upsert({ spotify_name: spotify_name.trim(), variant_name: variant_name.trim() }, { onConflict: "spotify_name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/artist-aliases
// body: { spotify_name }
// → alias 삭제
export async function DELETE(req: NextRequest) {
  const { spotify_name } = await req.json();
  if (!spotify_name?.trim()) {
    return NextResponse.json({ error: "spotify_name 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("artist_aliases")
    .delete()
    .eq("spotify_name", spotify_name.trim());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
