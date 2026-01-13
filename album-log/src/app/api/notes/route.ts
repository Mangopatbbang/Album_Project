// src/app/api/notes/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/notes?albumId=1&profileKey=arkyteccc
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");
  const profileKey = searchParams.get("profileKey");

  let query = supabaseServer.from("notes").select("*");

  if (albumId) {
    query = query.eq("album_id", Number(albumId));
  }
  if (profileKey) {
    query = query.eq("profile_key", profileKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

// POST /api/notes
// body: { albumId: number, profileKey: string, content: string }
export async function POST(req: Request) {
  const body = await req.json();
  const { albumId, profileKey, content } = body ?? {};

  if (!albumId || !profileKey) {
    return NextResponse.json(
      { error: "albumId and profileKey are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("notes")
    .upsert(
      {
        album_id: Number(albumId),
        profile_key: profileKey,
        content: content ?? "",
      },
      {
        onConflict: "album_id,profile_key",
      }
    )
    .select();

  if (error) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data?.[0] ?? null });
}
