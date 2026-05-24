import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { validateUser } from "@/lib/validateUser";

// GET /api/listening-logs?userId=X&albumId=Y
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const albumId = searchParams.get("albumId");

  if (!userId) {
    return NextResponse.json({ error: "userId 필수" }, { status: 400 });
  }

  const limitParam = searchParams.get("limit");
  const limit = albumId ? 200 : Math.min(parseInt(limitParam ?? "100") || 100, 1000);

  let query = supabaseServer
    .from("listening_logs")
    .select("id, listened_at, context, note, image_url, relistened, created_at, albums(id, title, artist, cover_url)")
    .eq("user_id", userId)
    .order("listened_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (albumId) query = query.eq("album_id", albumId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}

// POST /api/listening-logs
// body: { albumId, note?, context?: string[], listenedAt?, imageUrl? }
export async function POST(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { albumId, note, context, listenedAt, imageUrl } = body as {
    albumId: string;
    note?: string;
    context?: string[];
    listenedAt?: string;
    imageUrl?: string;
  };

  if (!albumId) {
    return NextResponse.json({ error: "albumId 필수" }, { status: 400 });
  }

  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const defaultDate = kst.toISOString().slice(0, 10);
  const finalDate = listenedAt ?? defaultDate;

  // 같은 앨범에 이전 기록이 있으면 relistened = true
  const { count } = await supabaseServer
    .from("listening_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authed.id)
    .eq("album_id", albumId);
  const relistened = (count ?? 0) > 0;

  const { data, error } = await supabaseServer
    .from("listening_logs")
    .insert({
      user_id: authed.id,
      album_id: albumId,
      listened_at: finalDate,
      note: note ?? null,
      context: context && context.length > 0 ? context : null,
      image_url: imageUrl ?? null,
      relistened,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, log: data });
}

// PATCH /api/listening-logs
// body: { id, note?, context?: string[], imageUrl? }
export async function PATCH(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();
  const { id, note, context, imageUrl } = body as {
    id: string;
    note?: string;
    context?: string[];
    imageUrl?: string | null;
  };

  if (!id) return NextResponse.json({ error: "id 필수" }, { status: 400 });

  const { error } = await supabaseServer
    .from("listening_logs")
    .update({
      note: note ?? null,
      context: context && context.length > 0 ? context : null,
      image_url: imageUrl ?? null,
    })
    .eq("id", id)
    .eq("user_id", authed.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/listening-logs?id=X
export async function DELETE(req: NextRequest) {
  const authed = await validateUser(req);
  if (!authed) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 필수" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("listening_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", authed.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
