import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";

// GET /api/admin/artist-use-variant
// → { stats: Record<spotify_name, { total: number; using: number }> }
// (alias 등록된 아티스트 전체의 variant 사용 현황)
export async function GET() {
  // 1) alias 등록된 아티스트 목록
  const { data: aliasData, error: aliasErr } = await supabaseServer
    .from("artist_aliases")
    .select("spotify_name");
  if (aliasErr) return NextResponse.json({ error: aliasErr.message }, { status: 500 });

  const names = (aliasData ?? []).map((r: { spotify_name: string }) => r.spotify_name);
  if (names.length === 0) return NextResponse.json({ stats: {} });

  // 2) 해당 아티스트들의 앨범 variant 사용 현황
  const { data: albumData, error: albumErr } = await supabaseServer
    .from("albums")
    .select("artist, use_artist_variant")
    .in("artist", names);
  if (albumErr) return NextResponse.json({ error: albumErr.message }, { status: 500 });

  const stats: Record<string, { total: number; using: number }> = {};
  for (const row of albumData ?? []) {
    const s = stats[row.artist] ?? { total: 0, using: 0 };
    s.total++;
    if (row.use_artist_variant) s.using++;
    stats[row.artist] = s;
  }

  return NextResponse.json({ stats });
}

// PATCH /api/admin/artist-use-variant
// body: { spotify_name, use_variant: boolean }
// → 해당 아티스트 전체 앨범 use_artist_variant 일괄 변경
export async function PATCH(req: NextRequest) {
  const { spotify_name, use_variant } = await req.json();
  if (!spotify_name?.trim() || use_variant === undefined) {
    return NextResponse.json({ error: "spotify_name과 use_variant 필수" }, { status: 400 });
  }
  const { error } = await supabaseServer
    .from("albums")
    .update({ use_artist_variant: use_variant })
    .eq("artist", spotify_name.trim());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings", { expire: 0 });
  revalidateTag("profile-ratings", { expire: 0 });
  return NextResponse.json({ ok: true });
}
