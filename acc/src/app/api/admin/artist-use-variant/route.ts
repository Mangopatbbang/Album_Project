import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

// GET /api/admin/artist-use-variant
export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { data: aliasData, error: aliasErr } = await supabaseServer
    .from("artist_aliases")
    .select("spotify_name");
  if (aliasErr) return NextResponse.json({ error: aliasErr.message }, { status: 500 });

  const names = (aliasData ?? []).map((r: { spotify_name: string }) => r.spotify_name);
  if (names.length === 0) return NextResponse.json({ stats: {} });

  const { data: albumData, error: albumErr } = await supabaseServer
    .from("albums")
    .select("artist, use_artist_variant")
    .in("artist", names);
  if (albumErr) return NextResponse.json({ error: albumErr.message }, { status: 500 });

  // Group by lowercase to handle case mismatches between albums.artist and artist_aliases.spotify_name
  const lcToCanonical: Record<string, string> = {};
  for (const n of names) lcToCanonical[n.toLowerCase()] = n;

  const stats: Record<string, { total: number; using: number }> = {};
  for (const row of albumData ?? []) {
    const key = lcToCanonical[row.artist.toLowerCase()] ?? row.artist;
    const s = stats[key] ?? { total: 0, using: 0 };
    s.total++;
    if (row.use_artist_variant) s.using++;
    stats[key] = s;
  }

  return NextResponse.json({ stats });
}

// PATCH /api/admin/artist-use-variant
// body: { spotify_name, use_variant: boolean }
export async function PATCH(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { spotify_name, use_variant } = await req.json();
  if (!spotify_name?.trim() || use_variant === undefined) {
    return NextResponse.json({ error: "spotify_name과 use_variant 필수" }, { status: 400 });
  }
  const { data, error } = await supabaseServer
    .from("albums")
    .update({ use_artist_variant: use_variant })
    .eq("artist", spotify_name.trim())
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/best");
  revalidatePath("/albums");
  revalidateTag("all-albums-with-ratings", { expire: 0 });
  revalidateTag("profile-ratings", { expire: 0 });
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
