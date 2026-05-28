import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

// GET /api/diary/albums — 내가 평가한 앨범 목록 (청음일기 모달 앨범 선택용)
export async function GET(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const { data, error } = await supabaseServer
    .from("ratings")
    .select("score, albums(id, title, artist, cover_url, genre, spotify_id, tracklist)")
    .eq("user_id", authed.id)
    .order("score", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type AlbumRow = {
    id: string;
    title: string;
    artist: string;
    cover_url: string | null;
    genre: string | null;
    spotify_id: string | null;
    tracklist: string | null;
  };

  const albums = (data ?? [])
    .map((r) => ({ score: r.score, ...(r.albums as unknown as AlbumRow) }))
    .filter((a) => a.id);

  const filtered = q
    ? albums.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.artist.toLowerCase().includes(q)
      )
    : albums;

  return NextResponse.json({ albums: filtered.slice(0, 50) });
}
