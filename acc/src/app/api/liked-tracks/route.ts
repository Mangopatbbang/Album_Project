import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { resolveArtistDisplay } from "@/lib/artistDisplay";

export type LikedTrackItem = {
  albumId: string;
  albumTitle: string;
  artist: string;
  artistDisplay: string;
  coverUrl: string | null;
  trackIndex: number;   // 1-based
  trackName: string;
};

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId 필요" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("ratings")
    .select("liked_tracks, albums(id, title, artist, use_artist_variant, cover_url, tracklist)")
    .eq("user_id", userId)
    .not("liked_tracks", "is", null)
    .neq("liked_tracks", "");

  if (error || !data) return NextResponse.json({ error: error?.message ?? "조회 실패" }, { status: 500 });

  // artist_display 해상도
  type AlbumRow = { id: string; title: string; artist: string; use_artist_variant: boolean | null; cover_url: string | null; tracklist: string | null };
  const albumObjects = data
    .map((r) => (r.albums as unknown) as AlbumRow | null)
    .filter((a): a is AlbumRow => a != null);
  const resolved = await resolveArtistDisplay(albumObjects);
  const displayMap = new Map(resolved.map((a) => [a.id, a.artist_display ?? a.artist]));

  const items: LikedTrackItem[] = [];

  for (const row of data) {
    const album = (row.albums as unknown) as AlbumRow | null;
    if (!album || !row.liked_tracks) continue;

    const tracks = (album.tracklist ?? "")
      .split(";")
      .map((t: string) => t.trim())
      .filter(Boolean);

    const indices = row.liked_tracks
      .split(",")
      .map((n: string) => parseInt(n.trim(), 10))
      .filter((n: number) => !isNaN(n) && n >= 1 && n <= tracks.length);

    for (const idx of indices) {
      items.push({
        albumId: album.id,
        albumTitle: album.title,
        artist: album.artist,
        artistDisplay: displayMap.get(album.id) ?? album.artist,
        coverUrl: album.cover_url ?? null,
        trackIndex: idx,
        trackName: tracks[idx - 1],
      });
    }
  }

  // 앨범 기준 정렬 → 같은 앨범 내 트랙 번호 순
  items.sort((a, b) => {
    const al = a.albumTitle.localeCompare(b.albumTitle, "ko");
    return al !== 0 ? al : a.trackIndex - b.trackIndex;
  });

  return NextResponse.json(items);
}
