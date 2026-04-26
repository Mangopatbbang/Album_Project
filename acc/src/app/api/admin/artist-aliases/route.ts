import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

// GET /api/admin/artist-aliases
// - ?artist=xxx      → 특정 아티스트 alias 조회 { alias: { spotify_name, variant_name } | null }
// - ?unaliased=true  → alias 없는 아티스트 목록 반환 { artists: string[] }
// - (no param)       → 전체 alias 목록 반환 { aliases: { spotify_name, variant_name }[] }
export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const url = new URL(req.url);
  const artist = url.searchParams.get("artist")?.trim();
  const unaliased = url.searchParams.get("unaliased") === "true";

  if (artist) {
    const { data, error } = await supabaseServer
      .from("artist_aliases")
      .select("spotify_name, variant_name")
      .eq("spotify_name", artist)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ alias: data ?? null });
  }

  if (unaliased) {
    // 앨범 테이블에서 모든 고유 아티스트 가져오기
    const { data: albumData, error: albumErr } = await supabaseServer
      .from("albums")
      .select("artist");
    if (albumErr) return NextResponse.json({ error: albumErr.message }, { status: 500 });

    // alias 목록 가져오기
    const { data: aliasData, error: aliasErr } = await supabaseServer
      .from("artist_aliases")
      .select("spotify_name");
    if (aliasErr) return NextResponse.json({ error: aliasErr.message }, { status: 500 });

    const aliasedSet = new Set((aliasData ?? []).map((a: { spotify_name: string }) => a.spotify_name));
    const allArtists = [...new Set((albumData ?? []).map((a: { artist: string }) => a.artist))].sort();
    const unaliasedArtists = allArtists.filter((a) => !aliasedSet.has(a));

    return NextResponse.json({ artists: unaliasedArtists });
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
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { spotify_name, variant_name } = await req.json();
  if (!spotify_name?.trim() || !variant_name?.trim()) {
    return NextResponse.json({ error: "spotify_name과 variant_name 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("artist_aliases")
    .upsert({ spotify_name: spotify_name.trim(), variant_name: variant_name.trim() }, { onConflict: "spotify_name" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings", { expire: 0 });
  revalidateTag("profile-ratings", { expire: 0 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/artist-aliases
// body: { spotify_name }
// → alias 삭제
export async function DELETE(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { spotify_name } = await req.json();
  if (!spotify_name?.trim()) {
    return NextResponse.json({ error: "spotify_name 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("artist_aliases")
    .delete()
    .eq("spotify_name", spotify_name.trim());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings", { expire: 0 });
  revalidateTag("profile-ratings", { expire: 0 });
  return NextResponse.json({ ok: true });
}
