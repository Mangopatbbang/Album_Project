import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateAdmin } from "@/lib/validateAdmin";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json(null);

  const { data, error } = await supabaseServer
    .from("artist_info")
    .select("*")
    .eq("artist_name", name)
    .maybeSingle();

  if (error) return NextResponse.json(null, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await validateAdmin(req))) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const body = await req.json();
  const { artist_name, label, debut_date, birth_date, country, note } = body;
  if (!artist_name) return NextResponse.json({ error: "artist_name required" }, { status: 400 });

  const payload = {
    artist_name,
    label: label || null,
    debut_date: debut_date || null,
    birth_date: birth_date || null,
    country: country || null,
    note: note || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseServer
    .from("artist_info")
    .upsert(payload, { onConflict: "artist_name" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
