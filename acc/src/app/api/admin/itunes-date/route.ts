import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/validateAdmin";

export async function GET(req: NextRequest) {
  const uid = req.headers.get("x-user-id");
  if (!(await validateAdmin(uid))) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get("artist") ?? "";
  const title = searchParams.get("title") ?? "";

  if (!artist || !title) return NextResponse.json({ date: null });

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + title)}&entity=album&limit=5&country=us`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return NextResponse.json({ date: null });
    const data = await res.json();
    const first = data.results?.[0];
    const date = first?.releaseDate ? first.releaseDate.slice(0, 10) : null;
    return NextResponse.json({ date, title: first?.collectionName, artist: first?.artistName });
  } catch {
    return NextResponse.json({ date: null });
  }
}
