import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { searchAndFetchAlbum, getAccessToken } from "@/lib/spotify";

const BATCH_SIZE = 20;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Phase 1: 미처리 앨범 (spotify_id = null)
async function phase1(offset: number) {
  const { data: albums, error } = await supabaseServer
    .from("albums")
    .select("id, title, artist, genre")
    .is("spotify_id", null)
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) return { error: error.message };
  if (!albums || albums.length === 0) {
    const { count } = await supabaseServer
      .from("albums").select("id", { count: "exact", head: true })
      .is("spotify_id", null);
    return { done: true, message: "Phase 1 완료", remaining: count ?? 0 };
  }

  let success = 0, notFound = 0;

  for (const album of albums) {
    await sleep(200);
    try {
      const result = await searchAndFetchAlbum(album.title, album.artist);

      if (!result) {
        await supabaseServer.from("albums").update({ spotify_id: "not_found" }).eq("id", album.id);
        notFound++;
        continue;
      }

      const updateData: Record<string, string | null> = {
        spotify_id: result.spotify_id,
        cover_url: result.cover_url || null,
        tracklist: result.tracklist,
        release_date: result.release_date,
        year: result.release_date ? result.release_date.slice(0, 4) : null,
      };

      // 장르: Spotify가 주면 사용, 없으면 기존 값 유지
      if (result.genres.length > 0) {
        updateData.genre = result.genres[0];
      }

      await supabaseServer.from("albums").update(updateData).eq("id", album.id);
      success++;
    } catch {
      notFound++;
    }
  }

  const { count: remaining } = await supabaseServer
    .from("albums").select("id", { count: "exact", head: true }).is("spotify_id", null);

  return { done: (remaining ?? 0) === 0, processed: albums.length, success, notFound, remaining: remaining ?? 0 };
}

// Phase 2: spotify_id로 바로 앨범 상세 조회해서 트랙리스트만 가져오기
async function phase2(offset: number) {
  const { data: albums, error } = await supabaseServer
    .from("albums")
    .select("id, spotify_id")
    .is("tracklist", null)
    .not("spotify_id", "is", null)
    .neq("spotify_id", "not_found")
    .range(offset, offset + BATCH_SIZE - 1);

  if (error) return { error: error.message };
  if (!albums || albums.length === 0) {
    return { done: true, message: "Phase 2 완료" };
  }

  const token = await getAccessToken();
  let success = 0, failed = 0;
  const errors: string[] = [];

  for (const album of albums) {
    await sleep(400);
    try {
      const res = await fetch(
        `https://api.spotify.com/v1/albums/${album.spotify_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") ?? "2", 10);
        await sleep(retryAfter * 1000);
        // retry once
        const retry = await fetch(
          `https://api.spotify.com/v1/albums/${album.spotify_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!retry.ok) {
          errors.push(`${album.spotify_id}: retry ${retry.status}`);
          failed++;
          continue;
        }
        const detail = await retry.json();
        const tracks = detail.tracks?.items ?? [];
        if (tracks.length > 0) {
          const tracklist = tracks.map((t: { name: string }) => t.name).join("; ");
          const update: Record<string, string | null> = { tracklist };
          if (detail.release_date) {
            update.release_date = detail.release_date;
            update.year = detail.release_date.slice(0, 4);
          }
          if (detail.genres?.length > 0) update.genre = detail.genres[0];
          await supabaseServer.from("albums").update(update).eq("id", album.id);
          success++;
        } else {
          await supabaseServer.from("albums").update({ tracklist: "none" }).eq("id", album.id);
          failed++;
        }
        continue;
      }

      if (!res.ok) {
        errors.push(`${album.spotify_id}: ${res.status}`);
        failed++;
        continue;
      }

      const detail = await res.json();
      const tracks = detail.tracks?.items ?? [];

      if (tracks.length > 0) {
        const tracklist = tracks.map((t: { name: string }) => t.name).join("; ");
        const update: Record<string, string | null> = { tracklist };
        if (detail.release_date) {
          update.release_date = detail.release_date;
          update.year = detail.release_date.slice(0, 4);
        }
        if (detail.genres?.length > 0) update.genre = detail.genres[0];
        await supabaseServer.from("albums").update(update).eq("id", album.id);
        success++;
      } else {
        // 트랙 없으면 "none"으로 마킹해서 무한루프 방지
        await supabaseServer.from("albums").update({ tracklist: "none" }).eq("id", album.id);
        failed++;
      }
    } catch (e) {
      errors.push(`${album.spotify_id}: ${e}`);
      failed++;
    }
  }

  const { count: remaining } = await supabaseServer
    .from("albums").select("id", { count: "exact", head: true })
    .is("tracklist", null)
    .not("spotify_id", "is", null)
    .neq("spotify_id", "not_found");

  return { done: (remaining ?? 0) === 0, processed: albums.length, success, failed, remaining: remaining ?? 0, errors };
}

export async function POST(req: NextRequest) {
  const { offset = 0, phase = 1 } = await req.json().catch(() => ({}));
  const result = phase === 2 ? await phase2(offset) : await phase1(offset);
  return NextResponse.json(result);
}

export async function GET() {
  const [{ count: unprocessed }, { count: noTracklist }, { count: notFound }, { count: withCover }] = await Promise.all([
    supabaseServer.from("albums").select("id", { count: "exact", head: true }).is("spotify_id", null),
    supabaseServer.from("albums").select("id", { count: "exact", head: true }).is("tracklist", null).not("spotify_id", "is", null).neq("spotify_id", "not_found"),
    supabaseServer.from("albums").select("id", { count: "exact", head: true }).eq("spotify_id", "not_found"),
    supabaseServer.from("albums").select("id", { count: "exact", head: true }).not("cover_url", "is", null),
  ]);

  return NextResponse.json({ unprocessed: unprocessed ?? 0, noTracklist: noTracklist ?? 0, notFound: notFound ?? 0, withCover: withCover ?? 0 });
}
