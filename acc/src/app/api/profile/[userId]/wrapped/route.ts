import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { scoreColor } from "@/lib/score";

export type WrappedData = {
  year: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  total: number;
  avgScore: string | null;
  topGenres: { genre: string; count: number }[];
  topArtists: { artist: string; count: number }[];
  peakMonth: { month: string; label: string; count: number } | null;
  bestAlbum: { id: string; title: string; artist: string; cover_url: string | null; score: number } | null;
  firstAlbum: { id: string; title: string; artist: string; cover_url: string | null; date: string } | null;
  hofCount: number;
  reviewCount: number;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [userRes, ratingsRes] = await Promise.all([
    supabaseServer.from("users").select("display_name, avatar_url").eq("id", userId).single(),
    supabaseServer
      .from("ratings")
      .select("score, one_line_review, updated_at, albums(id, title, artist, use_artist_variant, cover_url, genre)")
      .eq("user_id", userId)
      .gte("updated_at", `${yearStart}T00:00:00`)
      .lte("updated_at", `${yearEnd}T23:59:59`)
      .order("updated_at", { ascending: true }),
  ]);

  if (!userRes.data) return NextResponse.json({ error: "User not found" }, { status: 404 });

  type AlbumInfo = { id: string; title: string; artist: string; use_artist_variant?: boolean; cover_url: string | null; genre: string | null };
  type RatingRow = { score: number; one_line_review: string | null; updated_at: string; albums: AlbumInfo | null };

  const ratings = (ratingsRes.data ?? []) as unknown as RatingRow[];

  if (ratings.length === 0) {
    return NextResponse.json({
      year, userId, displayName: userRes.data.display_name, avatarUrl: userRes.data.avatar_url,
      total: 0, avgScore: null, topGenres: [], topArtists: [], peakMonth: null,
      bestAlbum: null, firstAlbum: null, hofCount: 0, reviewCount: 0,
    } satisfies WrappedData);
  }

  const scores = ratings.map((r) => r.score);
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  // 장르 TOP
  const genreMap = new Map<string, number>();
  for (const r of ratings) {
    if (r.albums?.genre) genreMap.set(r.albums.genre, (genreMap.get(r.albums.genre) ?? 0) + 1);
  }
  const topGenres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre, count]) => ({ genre, count }));

  // 아티스트 TOP
  const artistMap = new Map<string, number>();
  for (const r of ratings) {
    if (r.albums?.artist) artistMap.set(r.albums.artist, (artistMap.get(r.albums.artist) ?? 0) + 1);
  }
  const topArtists = [...artistMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([artist, count]) => ({ artist, count }));

  // 최다 청음 월
  const monthMap = new Map<string, number>();
  for (const r of ratings) {
    const month = r.updated_at.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }
  const peakMonthEntry = [...monthMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const peakMonth = peakMonthEntry
    ? { month: peakMonthEntry[0], label: MONTH_LABELS[parseInt(peakMonthEntry[0].slice(5, 7)) - 1], count: peakMonthEntry[1] }
    : null;

  // 최고점 앨범
  const sorted = [...ratings].sort((a, b) => b.score - a.score);
  const bestRating = sorted[0];
  const bestAlbum = bestRating?.albums
    ? { id: bestRating.albums.id, title: bestRating.albums.title, artist: bestRating.albums.artist, cover_url: bestRating.albums.cover_url, score: bestRating.score }
    : null;

  // 첫 청음
  const first = ratings[0];
  const firstAlbum = first?.albums
    ? { id: first.albums.id, title: first.albums.title, artist: first.albums.artist, cover_url: first.albums.cover_url, date: first.updated_at.slice(0, 10) }
    : null;

  // 명반 수 (8점)
  const hofCount = ratings.filter((r) => r.score === 8).length;

  // 소감 작성 수
  const reviewCount = ratings.filter((r) => r.one_line_review).length;

  return NextResponse.json({
    year, userId,
    displayName: userRes.data.display_name,
    avatarUrl: userRes.data.avatar_url,
    total: ratings.length,
    avgScore,
    topGenres,
    topArtists,
    peakMonth,
    bestAlbum,
    firstAlbum,
    hofCount,
    reviewCount,
  } satisfies WrappedData);
}
