import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";
import Header from "@/components/layout/Header";
import HallOfFameSection from "@/components/profile/HallOfFameSection";
import ArtistSection from "@/components/profile/ArtistSection";
import { RecentListSection, RecentReviewsSection } from "@/components/profile/RecentRatingsSection";
import { generateBadges, koGenre } from "@/lib/bio";
import ProfileCaptureButton from "@/components/profile/ProfileCaptureButton";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const user = USERS.find((u) => u.id === userId);
  if (!user) return {};
  return {
    title: `${user.display_name}의 청음 기록`,
    description: `${user.display_name}의 아차청음사 청음 기록`,
  };
}

type RatingRow = {
  score: number;
  one_line_review: string | null;
  updated_at: string;
  albums: {
    id: string;
    title: string;
    artist: string;
    year: string | null;
    genre: string | null;
    cover_url: string | null;
  } | null;
};


export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = USERS.find((u) => u.id === userId);
  if (!user) notFound();

  // 내 전체 평점 — 페이지네이션으로 1000행 제한 우회
  const allRawRatings: RatingRow[] = [];
  for (let page = 0; ; page++) {
    const { data: pageData } = await supabaseServer
      .from("ratings")
      .select("score, one_line_review, updated_at, albums(id, title, artist, year, genre, cover_url)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!pageData || pageData.length === 0) break;
    allRawRatings.push(...(pageData as unknown as RatingRow[]));
    if (pageData.length < 1000) break;
  }

  const validRatings = allRawRatings.filter((r) => r.albums !== null);
  const scores = validRatings.map((r) => r.score).sort((a, b) => a - b);
  const total = validRatings.length;
  const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(2) : null;
  const reviewCount = validRatings.filter((r) => r.one_line_review && r.one_line_review.trim().length > 0).length;

  // 아티스트 TOP 5
  const artistMap = new Map<string, { count: number; total: number }>();
  for (const r of validRatings) {
    const artist = r.albums?.artist ?? "기타";
    const prev = artistMap.get(artist) ?? { count: 0, total: 0 };
    artistMap.set(artist, { count: prev.count + 1, total: prev.total + r.score });
  }
  const allArtistEntries = [...artistMap.entries()]
    .map(([artist, { count, total: t }]) => ({ artist, count, avg: (t / count).toFixed(1) }));
  const artistByCount = allArtistEntries
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const artistByAvg = allArtistEntries
    .filter((a) => a.count >= 3)
    .sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg))
    .slice(0, 5);
  const maxArtistCount = artistByCount[0]?.count ?? 1;
  const maxArtistAvg = Math.max(...artistByAvg.map((a) => parseFloat(a.avg)), 1);

  // 월별 청음 (최근 12개월)
  const now = new Date();
  const monthData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    return { key, label, count: 0 };
  });
  for (const r of validRatings) {
    const key = r.updated_at.slice(0, 7);
    const m = monthData.find((x) => x.key === key);
    if (m) m.count++;
  }
  const maxMonthCount = Math.max(...monthData.map((m) => m.count), 1);

  // 최근 한줄 소감
  const recentReviews = validRatings
    .filter((r) => r.one_line_review && r.one_line_review.trim().length > 0)
    .slice(0, 8);

  // 점수 분포 (1~8)
  const scoreDist = Array.from({ length: 8 }, (_, i) => ({
    score: i + 1,
    count: scores.filter((s) => s === i + 1).length,
  }));
  const maxDistCount = Math.max(...scoreDist.map((d) => d.count), 1);

  // 장르 분포
  const genreMap = new Map<string, { count: number; total: number }>();
  for (const r of validRatings) {
    const g = r.albums?.genre ?? "기타";
    const prev = genreMap.get(g) ?? { count: 0, total: 0 };
    genreMap.set(g, { count: prev.count + 1, total: prev.total + r.score });
  }
  const genreList = [...genreMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([genre, { count, total }]) => ({ genre, count, avg: (total / count).toFixed(1) }));
  const maxGenreCount = genreList[0]?.count ?? 1;
  const topGenre = genreList[0]?.genre ?? null;

  // 명예의 전당 (8점)
  const hallOfFame = validRatings.filter((r) => r.score === 8);

  // 최근 20개
  const recent = validRatings.slice(0, 20);

  // 다른 멤버와 비교
  const otherUsers = USERS.filter((u) => u.id !== userId);
  const otherRatingsAll: { user_id: string; album_id: string; score: number }[] = [];
  for (let page = 0; ; page++) {
    const { data: pageData } = await supabaseServer
      .from("ratings")
      .select("user_id, album_id, score")
      .in("user_id", otherUsers.map((u) => u.id))
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!pageData || pageData.length === 0) break;
    otherRatingsAll.push(...pageData);
    if (pageData.length < 1000) break;
  }
  const otherRatings = otherRatingsAll;

  // 비교용 평점 맵 — allRawRatings에서 바로 생성 (중복 쿼리 제거)
  const myAlbumScoreMap = new Map<string, number>(
    validRatings.map((r) => [r.albums!.id, r.score])
  );

  const comparisons = otherUsers.map((other) => {
    const theirRatings = (otherRatings ?? []).filter((r) => r.user_id === other.id);
    const common = theirRatings.filter((r) => myAlbumScoreMap.has(r.album_id));
    const commonCount = common.length;
    if (commonCount === 0) return { user: other, commonCount: 0, diff: null };

    // MAE: 앨범별 절댓값 차이의 평균 (평균 비교보다 정확)
    const mae = common.reduce((s, r) => s + Math.abs((myAlbumScoreMap.get(r.album_id) ?? 0) - r.score), 0) / commonCount;
    const diff = parseFloat(mae.toFixed(2));
    return { user: other, commonCount, diff };
  });

  // 취향 궁합 (공통 5장 이상 중 diff 가장 작은 멤버)
  const bestMatch = comparisons
    .filter((c) => c.commonCount >= 5 && c.diff !== null)
    .sort((a, b) => Math.abs(a.diff!) - Math.abs(b.diff!))[0] ?? null;

  // 뱃지
  const topGenreEntry = genreList[0];
  const topArtistEntry = artistByCount[0];
  const badges = generateBadges({
    avg,
    topGenre: topGenreEntry?.genre ?? null,
    topGenreRatio: topGenreEntry ? topGenreEntry.count / Math.max(total, 1) : 0,
    topArtist: topArtistEntry?.artist ?? null,
    topArtistCount: topArtistEntry?.count ?? 0,
    topArtistAvg: topArtistEntry ? parseFloat(topArtistEntry.avg) : 0,
    eightCount: hallOfFame.length,
    total,
    reviewCount,
  });

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
    <Header />
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>

      <div id="profile-card" style={{ backgroundColor: "var(--bg)" }}>
      {/* 프로필 헤더 */}
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "32px 36px",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            backgroundColor: "var(--bg-elevated)",
            border: "2px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
          }}>
            {user.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 24, letterSpacing: "-0.03em" }}>
              {user.display_name}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              총 <span style={{ color: "var(--accent)", fontWeight: 600 }}>{total}</span>장 청음
            </p>
          </div>
          <ProfileCaptureButton targetId="profile-card" />
          {badges.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
              {badges.map((badge) => (
                <span key={badge} style={{
                  color: "var(--text-muted)",
                  fontSize: 11,
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 20,
                  padding: "3px 10px",
                  whiteSpace: "nowrap",
                }}>
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 핵심 스탯 4개 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { label: "평균 점수", value: avg ?? "—", unit: "/ 8", colorVal: avg },
            { label: "한줄 소감", value: reviewCount > 0 ? reviewCount : "—", unit: "개", colorVal: null },
          ].map((stat) => (
            <div key={stat.label} style={{
              backgroundColor: "var(--bg-elevated)",
              borderRadius: 8,
              padding: "14px 16px",
              border: "1px solid var(--border)",
            }}>
              <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 6 }}>
                {stat.label.toUpperCase()}
              </p>
              <p style={{ color: scoreColor(stat.colorVal), fontWeight: 700, fontSize: 22 }}>
                {stat.value}
                <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 400, marginLeft: 3 }}>
                  {stat.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 점수 분포 + 청음 캘린더 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            SCORE DISTRIBUTION
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {scoreDist.map((d) => (
              <div key={d.score} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{d.count > 0 ? d.count : ""}</span>
                <div style={{
                  width: "100%",
                  height: `${(d.count / maxDistCount) * 56 + (d.count > 0 ? 4 : 0)}px`,
                  backgroundColor: d.count > 0 ? scoreColor(d.score) : "var(--bg-elevated)",
                  borderRadius: "3px 3px 0 0",
                  opacity: d.count === 0 ? 0.3 : 1,
                  transition: "height 0.3s ease",
                  minHeight: 4,
                }} />
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{d.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
            청음 캘린더
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            {monthData.map((m) => (
              <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 9 }}>{m.count > 0 ? m.count : ""}</span>
                <div style={{
                  width: "100%",
                  height: `${Math.max((m.count / maxMonthCount) * 60, m.count > 0 ? 4 : 2)}px`,
                  backgroundColor: m.count > 0 ? "var(--accent)" : "var(--bg-elevated)",
                  borderRadius: "3px 3px 0 0",
                  opacity: m.count === 0 ? 0.3 : 1,
                  transition: "height 0.3s ease",
                }} />
                <span style={{ color: "var(--text-muted)", fontSize: 9 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠: 2컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

        {/* 왼쪽 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 명반전 */}
          {hallOfFame.length > 0 && (
            <HallOfFameSection
              albums={hallOfFame.map((r) => ({ ...r.albums!, score: r.score }))}
              count={hallOfFame.length}
            />
          )}

          {/* 아티스트 TOP 5 */}
          {artistByCount.length > 0 && (
            <ArtistSection
              byCount={artistByCount}
              byAvg={artistByAvg}
              maxCount={maxArtistCount}
              maxAvg={maxArtistAvg}
            />
          )}

          {/* 최근 한줄 소감 */}
          {recentReviews.length > 0 && (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
                최근 한줄 소감
              </p>
              <RecentReviewsSection items={recentReviews.map((r) => ({
                id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist,
                year: r.albums!.year ?? null, genre: r.albums!.genre ?? null, cover_url: r.albums!.cover_url ?? null,
                score: r.score, one_line_review: r.one_line_review, updated_at: r.updated_at,
              }))} />
            </div>
          )}

          {/* 최근 평가 */}
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 28px",
          }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
              최근 청음
            </p>
            <RecentListSection items={recent.map((r) => ({
              id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist,
              year: r.albums!.year ?? null, genre: r.albums!.genre ?? null, cover_url: r.albums!.cover_url ?? null,
              score: r.score, one_line_review: r.one_line_review, updated_at: r.updated_at,
            }))} />
          </div>
        </div>

        {/* 오른쪽 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 장르 분포 */}
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 28px",
          }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>
              청음 장르
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>
              최다 <span style={{ color: "var(--accent)" }}>{topGenre ? koGenre(topGenre) : ""}</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {genreList.map(({ genre, count, avg: gAvg }) => (
                <div key={genre}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-sub)", fontSize: 12 }}>{koGenre(genre)}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: scoreColor(gAvg), fontSize: 11, fontWeight: 600 }}>{gAvg}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{count}장</span>
                    </div>
                  </div>
                  <div style={{ height: 4, backgroundColor: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(count / maxGenreCount) * 100}%`,
                      backgroundColor: "var(--accent)",
                      borderRadius: 2,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 취향 궁합 */}
          {bestMatch && (
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
                취향 궁합
              </p>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>{bestMatch.user.emoji}</p>
                <Link href={`/profile/${bestMatch.user.id}`} style={{ color: "var(--text)", fontWeight: 600, fontSize: 14, textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">{bestMatch.user.display_name}</Link>
                <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                  공통 {bestMatch.commonCount}장 · 앨범당 평균{" "}
                  <span style={{ color: bestMatch.diff! < 0.8 ? "var(--accent)" : "var(--text-sub)", fontWeight: 600 }}>
                    {bestMatch.diff!.toFixed(2)}점 차이
                  </span>
                </p>
                <p style={{ color: "var(--accent)", fontSize: 12, marginTop: 8, fontWeight: 500 }}>
                  {bestMatch.diff! < 0.8 ? "취향이 가장 비슷한 청음인" : "그나마 가장 비슷한 청음인"}
                </p>
              </div>
            </div>
          )}

          {/* 멤버 비교 */}
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 28px",
          }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
              멤버 비교
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {comparisons.map(({ user: other, commonCount, diff }) => (
                <div key={other.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }} className="hover:opacity-70 transition-opacity cursor-default">
                  <Link href={`/profile/${other.id}`} style={{ color: "var(--text-sub)", fontSize: 13, textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">
                    {other.emoji} {other.display_name}
                  </Link>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>공통 {commonCount}장</p>
                    {diff !== null && (
                      <p style={{
                        color: diff < 0.8 ? "var(--accent)" : diff > 1.5 ? "var(--text-muted)" : "var(--text-sub)",
                        fontSize: 12, fontWeight: 600, marginTop: 2,
                      }}>
                        {diff < 0.8 ? "취향 비슷" : `앨범당 ${diff}점 차이`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
    </div>
  );
}
