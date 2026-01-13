import { NextResponse as NR } from "next/server";
import { supabaseServer as server } from "@/lib/supabaseServer";

// ratings 테이블:
// album_id (number), profile_key (string), score (number)

// GET
// - ?albumId=123&mode=allForAlbum        → 해당 앨범의 모든 유저 평점 배열
// - ?albumId=123&profileKey=arkyteccc   → 특정 유저의 점수 (단일)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId");
  const profileKey = searchParams.get("profileKey");
  const mode = searchParams.get("mode");

  let query = server.from("ratings").select("*");

  if (albumId) {
    query = query.eq("album_id", Number(albumId));
  }
  if (profileKey) {
    query = query.eq("profile_key", profileKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET /api/ratings error:", error);
    return NR.json({ error: error.message }, { status: 500 });
  }

  const rows =
    (data ?? []) as { album_id: number; profile_key: string; score: number | null }[];

  // 앨범 전체 평점 리스트
  if (mode === "allForAlbum" && albumId && !profileKey) {
    return NR.json({ ratings: rows });
  }

  // 단일 유저 점수 (기존 호환)
  const row = rows[0];

  return NR.json({
    score: typeof row?.score === "number" ? row.score : null,
    rating: row ?? null,
  });
}

// POST: 점수 저장/업데이트
export async function POST(req: Request) {
  const body = await req.json();
  const { albumId, profileKey, score } = body as {
    albumId: string | number;
    profileKey: string;
    score: number;
  };

  const { error } = await server.from("ratings").upsert(
    {
      album_id: Number(albumId),
      profile_key: profileKey,
      score,
    },
    { onConflict: "album_id,profile_key" }
  );

  if (error) {
    console.error("POST /api/ratings error:", error);
    return NR.json({ error: error.message }, { status: 500 });
  }

  return NR.json({ ok: true });
}

// DELETE: 점수 삭제
export async function DELETE(req: Request) {
  const body = await req.json();
  const { albumId, profileKey } = body as {
    albumId: string | number;
    profileKey: string;
  };

  const { error } = await server
    .from("ratings")
    .delete()
    .eq("album_id", Number(albumId))
    .eq("profile_key", profileKey);

  if (error) {
    console.error("DELETE /api/ratings error:", error);
    return NR.json({ error: error.message }, { status: 500 });
  }

  return NR.json({ ok: true });
}
