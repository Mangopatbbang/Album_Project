import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export type TimelineEvent = {
  type: "rating" | "diary";
  date: string;
  album: {
    id: string;
    title: string;
    artist: string;
    artist_display?: string | null;
    cover_url: string | null;
    genre: string | null;
  };
  score?: number;
  review?: string | null;
  note?: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const [ratingsRes, logsRes] = await Promise.all([
    supabaseServer
      .from("ratings")
      .select("album_id, score, one_line_review, updated_at, albums(id, title, artist, use_artist_variant, cover_url, genre)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabaseServer
      .from("listening_logs")
      .select("album_id, listened_at, note, albums(id, title, artist, use_artist_variant, cover_url)")
      .eq("user_id", userId)
      .order("listened_at", { ascending: false }),
  ]);

  const events: TimelineEvent[] = [];

  for (const r of ratingsRes.data ?? []) {
    const album = r.albums as unknown as { id: string; title: string; artist: string; use_artist_variant?: boolean; cover_url: string | null; genre: string | null } | null;
    if (!album) continue;
    events.push({
      type: "rating",
      date: r.updated_at.slice(0, 10),
      album: {
        id: album.id,
        title: album.title,
        artist: album.artist,
        cover_url: album.cover_url,
        genre: album.genre,
      },
      score: r.score,
      review: r.one_line_review,
    });
  }

  for (const l of logsRes.data ?? []) {
    const album = l.albums as unknown as { id: string; title: string; artist: string; cover_url: string | null } | null;
    if (!album) continue;
    events.push({
      type: "diary",
      date: l.listened_at,
      album: {
        id: album.id,
        title: album.title,
        artist: album.artist,
        cover_url: album.cover_url,
        genre: null,
      },
      note: l.note,
    });
  }

  // 날짜 역순 정렬
  events.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ events });
}
