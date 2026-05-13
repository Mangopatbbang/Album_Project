import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

// GET /api/admin/artist-images → { overrides: { artist_name, image_url }[] }
export async function GET(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { data, error } = await supabaseServer
    .from("artist_images")
    .select("artist_name, image_url")
    .order("artist_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ overrides: data ?? [] });
}

// POST /api/admin/artist-images → body: { artist_name, image_url } → upsert
export async function POST(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { artist_name, image_url } = await req.json() as { artist_name?: string; image_url?: string };
  if (!artist_name?.trim() || !image_url?.trim()) {
    return NextResponse.json({ error: "artist_name, image_url 필수" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("artist_images")
    .upsert({ artist_name: artist_name.trim(), image_url: image_url.trim() }, { onConflict: "artist_name" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/artist-images → body: { artist_name }
export async function DELETE(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { artist_name } = await req.json() as { artist_name?: string };
  if (!artist_name?.trim()) return NextResponse.json({ error: "artist_name 필수" }, { status: 400 });

  const { error } = await supabaseServer
    .from("artist_images")
    .delete()
    .eq("artist_name", artist_name.trim());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
