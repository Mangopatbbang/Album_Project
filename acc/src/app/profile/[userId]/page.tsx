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
import ProfileEditButton from "@/components/profile/ProfileEditButton";
import AvatarWithLightbox from "@/components/profile/AvatarWithLightbox";
import WatchlistSection from "@/components/profile/WatchlistSection";
import ComparisonSection from "@/components/profile/ComparisonSection";
import { fetchProfileRatings, type ProfileRatingRow } from "@/lib/stats";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const user = USERS.find((u) => u.id === userId);
  if (!user) return {};
  return {
    title: `${user.display_name}의 청음 기록`,
    description: `${user.display_name}의 아차청음사 청음 기록`,
  };
}

type RatingRow = ProfileRatingRow;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = USERS.find((u) => u.id === userId);
  if (!user) notFound();

  // DB에서 최신 프로필 정보 가져오기 (avatar_url, display_name, emoji 반영)
  const { data: dbUser } = await supabaseServer
    .from("users")
    .select("id, display_name, emoji, avatar_url")
    .eq("id", userId)
    .single();

  const displayName = (dbUser as { display_name?: string } | null)?.display_name ?? user.display_name;
  const displayEmoji = (dbUser as { emoji?: string } | null)?.emoji ?? user.emoji;
  const avatarUrl = (dbUser as { avatar_url?: string | null } | null)?.avatar_url ?? null;

  // 내 전체 평점 (1시간 캐시, 평점 저장/삭제 시 revalidateTag로 즉시 갱신)
  const allRawRatings: RatingRow[] = await fetchProfileRatings(userId);

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
    <main style={{ maxWidth: 1100, margin: "0 auto" }} className="px-4 sm:px-6 py-8 sm:py-10 pb-20">

      <div id="profile-card" style={{ backgroundColor: "var(--bg)" }}>
      {/* 프로필 헤더 */}
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        marginBottom: 20,
      }} className="p-5 sm:p-8">
        {/* 아바타 + 이름 + 버튼들 */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 mb-6">
          <AvatarWithLightbox avatarUrl={avatarUrl} emoji={displayEmoji} displayName={displayName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.03em" }} className="text-xl sm:text-2xl">
              {displayName}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              총 <span style={{ color: "var(--accent)", fontWeight: 600 }}>{total}</span>장 청음
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ProfileCaptureButton targetId="profile-card" />
            <ProfileEditButton userId={userId} initialDisplayName={displayName} initialEmoji={displayEmoji} initialAvatarUrl={avatarUrl} />
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto sm:flex-col sm:items-end">
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

        {/* 핵심 스탯 */}
        <div className="grid grid-cols-2 gap-3">
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
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
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
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{d.score}</span>
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
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{m.count > 0 ? m.count : ""}</span>
                <div style={{
                  width: "100%",
                  height: `${Math.max((m.count / maxMonthCount) * 60, m.count > 0 ? 4 : 2)}px`,
                  backgroundColor: m.count > 0 ? "var(--accent)" : "var(--bg-elevated)",
                  borderRadius: "3px 3px 0 0",
                  opacity: m.count === 0 ? 0.3 : 1,
                  transition: "height 0.3s ease",
                }} />
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{m.label}</span>
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

          {/* 나중에 들을 앨범 (본인만 보임) */}
          <WatchlistSection userId={userId} />

          {/* 취향 궁합 + 멤버 비교 (lazy load) */}
          <ComparisonSection userId={userId} />
        </div>
      </div>
      </div>
    </main>
    </div>
  );
}
