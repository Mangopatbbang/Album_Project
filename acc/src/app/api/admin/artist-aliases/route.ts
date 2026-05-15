import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";
import { validateUser } from "@/lib/validateUser";

// GET /api/admin/artist-aliases
// - ?artist=xxx      → 특정 아티스트 alias 조회 { alias: { spotify_name, variant_name } | null }
// - ?unaliased=true  → alias 없는 아티스트 목록 반환 { artists: string[] }
// - (no param)       → 전체 alias 목록 반환 { aliases: { spotify_name, variant_name }[] }
export async function GET(req: NextRequest) {
  if (!(await validateUser(req))) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
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

  if (url.searchParams.get("distinct") === "true") {
    const artists = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await supabaseServer.from("albums").select("artist").range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data?.length) break;
      for (const r of data as { artist: string }[]) artists.add(r.artist);
      if (data.length < 1000) break;
      from += 1000;
    }
    return NextResponse.json({ artists: [...artists].sort() });
  }

  if (unaliased) {
    const albumArtists = new Set<string>();
    let from = 0;
    while (true) {
      const { data, error } = await supabaseServer.from("albums").select("artist").range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data?.length) break;
      for (const r of data as { artist: string }[]) albumArtists.add(r.artist);
      if (data.length < 1000) break;
      from += 1000;
    }
    const { data: aliasData, error: aliasErr } = await supabaseServer
      .from("artist_aliases")
      .select("spotify_name");
    if (aliasErr) return NextResponse.json({ error: aliasErr.message }, { status: 500 });

    const aliasedSet = new Set((aliasData ?? []).map((a: { spotify_name: string }) => a.spotify_name.toLowerCase()));
    const unaliasedArtists = [...albumArtists].sort().filter((a) => !aliasedSet.has(a.toLowerCase()));

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
export async function POST(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
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
  revalidateTag("artist-aliases");
  revalidateTag("all-albums-with-ratings");
  revalidateTag("profile-ratings");
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/artist-aliases
// body: { spotify_name }
export async function DELETE(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { spotify_name } = await req.json();
  if (!spotify_name?.trim()) {
    return NextResponse.json({ error: "spotify_name 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("artist_aliases")
    .delete()
    .eq("spotify_name", spotify_name.trim());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 별칭 삭제 시 해당 아티스트 앨범 전체에 use_artist_variant 자동 비활성화
  await supabaseServer
    .from("albums")
    .update({ use_artist_variant: false })
    .filter("artist", "ilike", spotify_name.trim());

  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("artist-aliases");
  revalidateTag("all-albums-with-ratings");
  revalidateTag("profile-ratings");
  return NextResponse.json({ ok: true });
}
