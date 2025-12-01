// src/app/api/ratings/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/ratings?albumId=1&profileKey=arkyteccc  (둘 중 하나만 써도 됨)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");
  const profileKey = searchParams.get("profileKey");

  let query = supabaseServer.from("ratings").select("*");

  if (albumId) {
    query = query.eq("album_id", Number(albumId));
  }
  if (profileKey) {
    query = query.eq("profile_key", profileKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET /api/ratings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ratings: data ?? [] });
}

// POST /api/ratings
// body: { albumId: number, profileKey: string, score: number }
export async function POST(req: Request) {
  const body = await req.json();
  const { albumId, profileKey, score } = body ?? {};

  if (!albumId || !profileKey || typeof score !== "number") {
    return NextResponse.json(
      { error: "albumId, profileKey, score are required" },
      { status: 400 }
    );
  }

  // (album_id, profile_key) 조합은 하나만 있게 upsert
  const { data, error } = await supabaseServer
    .from("ratings")
    .upsert(
      {
        album_id: Number(albumId),
        profile_key: profileKey,
        score,
      },
      {
        onConflict: "album_id,profile_key",
      }
    )
    .select();

  if (error) {
    console.error("POST /api/ratings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rating: data?.[0] ?? null });
}
