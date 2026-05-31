import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// 취향이 가장 비슷한 유저(피어슨 상관계수 최고)가 7점 이상 준 앨범 중
// 본인이 아직 평가하지 않은 앨범 추천
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // 전체 ratings 가져오기
  const { data: allRatings } = await supabaseServer
    .from("ratings")
    .select("user_id, album_id, score");

  if (!allRatings?.length) return NextResponse.json({ items: [], peer: null });

  // 본인 평가 맵
  const myRatings = new Map<string, number>();
  for (const r of allRatings.filter((r) => r.user_id === userId)) {
    myRatings.set(r.album_id, r.score);
  }
  if (!myRatings.size) return NextResponse.json({ items: [], peer: null });

  // 다른 유저별 ratings 맵
  const otherUsers = [...new Set(allRatings.map((r) => r.user_id))].filter((id) => id !== userId);

  // 피어슨 상관계수 계산
  let bestPeer: { userId: string; corr: number } | null = null;

  for (const peerId of otherUsers) {
    const peerRatings = new Map<string, number>();
    for (const r of allRatings.filter((r) => r.user_id === peerId)) {
      peerRatings.set(r.album_id, r.score);
    }

    // 공통 앨범
    const common = [...myRatings.keys()].filter((id) => peerRatings.has(id));
    if (common.length < 5) continue;

    const xs = common.map((id) => myRatings.get(id)!);
    const ys = common.map((id) => peerRatings.get(id)!);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
    const den = Math.sqrt(
      xs.reduce((s, x) => s + (x - meanX) ** 2, 0) *
      ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
    );
    if (den === 0) continue;
    const corr = num / den;

    if (!bestPeer || corr > bestPeer.corr) bestPeer = { userId: peerId, corr };
  }

  if (!bestPeer || bestPeer.corr < 0.3) return NextResponse.json({ items: [], peer: null });

  // 피어가 7점 이상 줬고 본인이 아직 평가 안 한 앨범
  const peerHighRated = allRatings
    .filter((r) => r.user_id === bestPeer!.userId && r.score >= 7 && !myRatings.has(r.album_id))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!peerHighRated.length) return NextResponse.json({ items: [], peer: bestPeer });

  const albumIds = peerHighRated.map((r) => r.album_id);
  const { data: albums } = await supabaseServer
    .from("albums")
    .select("id, title, artist, cover_url, spotify_id")
    .in("id", albumIds);

  const { data: peerUser } = await supabaseServer
    .from("users")
    .select("id, display_name, avatar_url")
    .eq("id", bestPeer.userId)
    .single();

  const items = peerHighRated.map((r) => {
    const album = albums?.find((a) => a.id === r.album_id);
    return album ? {
      album_id: r.album_id,
      title: album.title,
      artist: album.artist,
      cover_url: album.cover_url ?? null,
      spotify_id: album.spotify_id ?? null,
      peer_score: r.score,
    } : null;
  }).filter(Boolean);

  return NextResponse.json({
    items,
    peer: {
      id: bestPeer.userId,
      display_name: peerUser?.display_name ?? bestPeer.userId,
      avatar_url: peerUser?.avatar_url ?? null,
      corr: Math.round(bestPeer.corr * 100) / 100,
    },
  });
}
