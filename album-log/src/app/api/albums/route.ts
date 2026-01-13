// app/api/albums/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// MusicBrainz는 User-Agent 권장
const MB_HEADERS = {
  "User-Agent": "palmanalbum/1.0 (contact: you@example.com)",
};

type AddAlbumBody = {
  title: string;
  artist: string;
  genre?: string | null;
  year?: string | null;
};

function enc(q: string) {
  return encodeURIComponent(q);
}

async function fetchFromMusicBrainz(title: string, artist: string) {
  // 1) release 검색
  const searchUrl =
    `https://musicbrainz.org/ws/2/release/?query=` +
    enc(`release:"${title}" AND artist:"${artist}"`) +
    `&fmt=json&limit=1`;

  const sr = await fetch(searchUrl, { headers: MB_HEADERS });
  if (!sr.ok) return null;

  const sj = await sr.json();
  const hit = sj?.releases?.[0];
  if (!hit?.id) return null;

  const mb_release_id = String(hit.id);
  const resolvedYear =
    hit?.date ? String(hit.date).slice(0, 4) : null;

  // 2) 트랙리스트 (release 상세 + recordings)
  const detailUrl = `https://musicbrainz.org/ws/2/release/${mb_release_id}?inc=recordings&fmt=json`;
  const dr = await fetch(detailUrl, { headers: MB_HEADERS });

  let tracks: string[] = [];
  if (dr.ok) {
    const dj = await dr.json();
    const media = dj?.media ?? [];
    for (const m of media) {
      for (const tr of m?.tracks ?? []) {
        const t = tr?.title;
        if (typeof t === "string" && t.trim()) tracks.push(t.trim());
      }
    }
  }

  // 3) 커버 (Cover Art Archive) - 있으면 이미지가 내려옴, 없으면 404
  const coverCandidate = `https://coverartarchive.org/release/${mb_release_id}/front-500`;
  let cover_url: string | null = null;
  const cr = await fetch(coverCandidate, { method: "GET" });
  if (cr.ok) cover_url = coverCandidate;

  return {
    mb_release_id,
    year: resolvedYear,
    tracks: tracks.length ? tracks : null,
    cover_url,
    source: "musicbrainz",
  };
}

// GET: 앨범 목록 (DB에서)
export async function GET() {
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 프론트는 id를 string으로 쓰고 있어서 string으로 내려줌
  const albums = (data ?? []).map((a: any) => ({
    ...a,
    id: String(a.id),
    sheet_id: a.sheet_id ?? null,
  }));

  return NextResponse.json({ albums });
}

// POST: 앨범 추가 + 메타데이터 자동 채우기
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AddAlbumBody;

    const title = body.title?.trim();
    const artist = body.artist?.trim();
    const genre = body.genre?.trim() ?? null;
    const year = body.year?.trim() ?? null;

    if (!title || !artist) {
      return NextResponse.json(
        { error: "title/artist는 필수입니다." },
        { status: 400 }
      );
    }

    // 0) sheet_id는 “마지막 sheet_id + 1”로 채번(전체공유라 단순하게)
    const { data: maxRow } = await supabase
      .from("albums")
      .select("sheet_id")
      .order("sheet_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSheetId =
      typeof maxRow?.sheet_id === "number" ? maxRow.sheet_id + 1 : 1;

    // 1) albums insert
    const { data: inserted, error: insErr } = await supabase
      .from("albums")
      .insert([
        {
          sheet_id: nextSheetId,
          title,
          artist,
          genre,
          year,
        },
      ])
      .select("*")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message ?? "albums insert failed" },
        { status: 500 }
      );
    }

    // 2) MusicBrainz 메타 fetch
    const meta = await fetchFromMusicBrainz(title, artist);

    // meta 없으면 앨범만 반환
    if (!meta) {
      return NextResponse.json({
        album: { ...inserted, id: String(inserted.id) },
        metadata: null,
      });
    }

    // 3) album_metadata upsert
    // 너 테이블이 album_id TEXT라서 일단 string으로 저장 (나중에 bigint로 마이그레이션 가능)
    const albumIdText = String(inserted.id);

    await supabase
      .from("album_metadata")
      .upsert(
        [
          {
            album_id: albumIdText,
            mb_release_id: meta.mb_release_id,
            cover_url: meta.cover_url,
            year: meta.year,
            tracks: meta.tracks,
            source: meta.source,
          },
        ],
        { onConflict: "album_id" }
      );

    // 4) albums도 즉시 업데이트(프론트에서 바로 쓰기 좋게)
    const tracklistText = meta.tracks ? JSON.stringify(meta.tracks) : null;
    const finalYear = meta.year ?? year;

    const { data: updated } = await supabase
      .from("albums")
      .update({
        cover_url: meta.cover_url,
        year: finalYear,
        tracklist: tracklistText,
      })
      .eq("id", inserted.id)
      .select("*")
      .single();

    return NextResponse.json({
      album: { ...(updated ?? inserted), id: String((updated ?? inserted).id) },
      metadata: meta,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
