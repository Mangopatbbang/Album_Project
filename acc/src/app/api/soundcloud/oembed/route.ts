import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url 필수" }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
  } catch {
    return NextResponse.json({ error: "SoundCloud 연결 실패" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "SoundCloud에서 정보를 가져오지 못했습니다" }, { status: 404 });
  }

  const data = await res.json();
  return NextResponse.json({
    title: data.title ?? "",
    author: data.author_name ?? "",
    thumbnail: data.thumbnail_url ?? null,
    html: data.html ?? "",
  });
}
