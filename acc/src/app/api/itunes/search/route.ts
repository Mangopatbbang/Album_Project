import { NextRequest, NextResponse } from "next/server";
import { searchItunesAlbumCandidates, fetchItunesTracklist } from "@/lib/itunes";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim();
  const artist = req.nextUrl.searchParams.get("artist")?.trim();
  const collectionId = req.nextUrl.searchParams.get("collectionId");

  if (!title && !artist) {
    return NextResponse.json({ error: "title 또는 artist 중 하나는 필수" }, { status: 400 });
  }

  // collectionId가 있으면 트랙리스트만 가져오기
  if (collectionId) {
    const tracklist = await fetchItunesTracklist(Number(collectionId));
    return NextResponse.json({ tracklist });
  }

  // 후보 목록 반환
  const candidates = await searchItunesAlbumCandidates(title ?? "", artist ?? "");
  if (candidates.length === 0) {
    return NextResponse.json({ found: false, candidates: [] });
  }

  return NextResponse.json({ found: true, candidates });
}
