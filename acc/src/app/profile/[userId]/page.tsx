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
import { generateBadges, koGenre, GENRE_EMOJI } from "@/lib/bio";
import ProfileCaptureButton from "@/components/profile/ProfileCaptureButton";
import ProfileEditButton from "@/components/profile/ProfileEditButton";
import MobileLogoutButton from "@/components/profile/MobileLogoutButton";
import AvatarWithLightbox from "@/components/profile/AvatarWithLightbox";
import WatchlistSection from "@/components/profile/WatchlistSection";
import ComparisonSection from "@/components/profile/ComparisonSection";
import BadgesWithTooltip from "@/components/profile/BadgesWithTooltip";
import CalendarSection from "@/components/profile/CalendarSection";
import LikedTracksButton from "@/components/profile/LikedTracksButton";
import { fetchProfileRatings, fetchAllUserGenreEmojis, type ProfileRatingRow } from "@/lib/stats";

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
  const [allRawRatings, allUserGenreEmojis]: [RatingRow[], Record<string, string[]>] = await Promise.all([
    fetchProfileRatings(userId),
    fetchAllUserGenreEmojis(),
  ]);

  const validRatings = allRawRatings.filter((r) => r.albums !== null);
  const scores = validRatings.map((r) => r.score).sort((a, b) => a - b);
  const total = validRatings.length;
  const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(2) : null;
  const reviewCount = validRatings.filter((r) => r.one_line_review && r.one_line_review.trim().length > 0).length;

  // 아티스트 TOP 5 (extra_artists 포함 — 콜라보 앨범도 각 아티스트 집계에 반영)
  const artistMap = new Map<string, { count: number; total: number }>();
  const artistDisplayMap = new Map<string, string>(); // spotify_name → artist_display
  for (const r of validRatings) {
    const primary = r.albums?.artist ?? "기타";
    const primaryDisplay = r.albums?.artist_display ?? primary;
    const extras = r.albums?.extra_artists
      ? r.albums.extra_artists.split(";").map((s) => s.trim()).filter(Boolean)
      : [];
    for (const artist of [primary, ...extras]) {
      const prev = artistMap.get(artist) ?? { count: 0, total: 0 };
      artistMap.set(artist, { count: prev.count + 1, total: prev.total + r.score });
      if (artist === primary && !artistDisplayMap.has(artist)) {
        artistDisplayMap.set(artist, primaryDisplay);
      }
    }
  }
  const allArtistEntries = [...artistMap.entries()]
    .map(([artist, { count, total: t }]) => ({ artist, artist_display: artistDisplayMap.get(artist), count, avg: (t / count).toFixed(1) }));
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
    const label = `${d.getMonth() + 1}`;
    return { key, label, count: 0 };
  });
  for (const r of validRatings) {
    const key = r.updated_at.slice(0, 7);
    const m = monthData.find((x) => x.key === key);
    if (m) m.count++;
  }
  const maxMonthCount = Math.max(...monthData.map((m) => m.count), 1);

  // 일별 청음 (캘린더용 — 전체 기간)
  const dailyData: Record<string, { title: string; artist: string; artist_display?: string; cover_url: string | null; score: number }[]> = {};
  for (const r of validRatings) {
    const key = r.updated_at.slice(0, 10); // "YYYY-MM-DD"
    if (!dailyData[key]) dailyData[key] = [];
    dailyData[key].push({
      title: r.albums!.title,
      artist: r.albums!.artist,
      artist_display: r.albums!.artist_display,
      cover_url: r.albums!.cover_url ?? null,
      score: r.score,
    });
  }

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
  const genreMap = new Map<string, { count: number; total: number; domestic: number; foreign: number }>();
  for (const r of validRatings) {
    const g = r.albums?.genre ?? "기타";
    const region = r.albums?.region ?? null;
    const prev = genreMap.get(g) ?? { count: 0, total: 0, domestic: 0, foreign: 0 };
    genreMap.set(g, {
      count: prev.count + 1,
      total: prev.total + r.score,
      domestic: prev.domestic + (region === "국내" ? 1 : 0),
      foreign: prev.foreign + (region === "해외" ? 1 : 0),
    });
  }
  const genreList = [...genreMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([genre, { count, total, domestic, foreign }]) => ({
      genre,
      count,
      avg: (total / count).toFixed(1),
      domestic,
      foreign,
    }));
  const maxGenreCount = genreList[0]?.count ?? 1;
  const topGenre = genreList[0]?.genre ?? null;

  // 전체 국내/해외 비율
  const totalDomestic = validRatings.filter((r) => r.albums?.region === "국내").length;
  const totalForeign = validRatings.filter((r) => r.albums?.region === "해외").length;

  // 상위 2 장르 이모지
  const genreEmojis = genreList.slice(0, 2).map(({ genre }) => GENRE_EMOJI[koGenre(genre)] ?? "🎵");

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
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>

      <div id="profile-card" style={{ backgroundColor: "var(--bg)" }}>

      {/* ── 프로필 헤더 (압축) ── */}
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        marginBottom: 16,
        padding: "20px 24px",
      }}>
        <div className="flex flex-wrap items-center gap-3">
          <AvatarWithLightbox avatarUrl={avatarUrl} emoji={displayEmoji} displayName={displayName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.03em", fontSize: 20 }}>
              {displayName}
            </p>
            {/* 인라인 스탯 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 4 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                청음 <span style={{ color: "var(--accent)", fontWeight: 600 }}>{total}</span>장
              </span>
              {avg && (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  평균 <span style={{ color: scoreColor(avg), fontWeight: 600 }}>{avg}점</span>
                </span>
              )}
              {reviewCount > 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  소감 <span style={{ color: "var(--text-sub)", fontWeight: 500 }}>{reviewCount}개</span>
                </span>
              )}
              <LikedTracksButton userId={userId} />
            </div>
            {/* 뱃지 */}
            {(genreEmojis.length > 0 || badges.length > 0) && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {genreEmojis.map((emoji, i) => (
                  <span
                    key={i}
                    title={koGenre(genreList[i]?.genre ?? "")}
                    style={{
                      fontSize: 14,
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 20,
                      padding: "2px 8px",
                      cursor: "default",
                    }}
                  >
                    {emoji}
                  </span>
                ))}
                {badges.length > 0 && <BadgesWithTooltip badges={badges} />}
              </div>
            )}
          </div>
          {/* 버튼: 모바일 full-width 우측 정렬, sm 이상은 자동 */}
          <div className="flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-start">
            <MobileLogoutButton userId={userId} />
            <ProfileCaptureButton targetId="profile-card" />
            <ProfileEditButton userId={userId} initialDisplayName={displayName} initialEmoji={displayEmoji} initialAvatarUrl={avatarUrl} />
          </div>
        </div>
      </div>

      {/* ── 명반전 (상단 강조) ── */}
      {hallOfFame.length > 0 && (
        <div style={{
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}>
          {/* 헤더 배너 */}
          <div style={{
            background: "linear-gradient(135deg, rgba(232,213,163,0.12) 0%, rgba(232,213,163,0.04) 100%)",
            borderBottom: "1px solid var(--border)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--accent)", fontSize: 16 }}>★</span>
              <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>명반전</span>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>8점 · {hallOfFame.length}장</span>
            </div>
          </div>
          <div style={{ backgroundColor: "var(--bg-card)", padding: "20px 24px" }}>
            <HallOfFameSection
              albums={hallOfFame.map((r) => ({ ...r.albums!, score: r.score }))}
              count={hallOfFame.length}
              inline
            />
          </div>
        </div>
      )}

      {/* ── 점수 분포 + 청음 캘린더 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* 점수 분포 — 클릭하면 음반고로 이동 */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4 sm:p-5">
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12 }}>
            점수 분포
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72 }}>
            {scoreDist.map((d) => (
              <Link
                key={d.score}
                href={d.count > 0 ? `/albums?score=${d.score}&scoreUserId=${userId}` : "#"}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none" }}
                title={d.count > 0 ? `${d.score}점 앨범 ${d.count}장 보기` : undefined}
                className={d.count > 0 ? "group" : ""}
              >
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{d.count > 0 ? d.count : ""}</span>
                <div style={{
                  width: "100%",
                  height: `${(d.count / maxDistCount) * 48 + (d.count > 0 ? 4 : 0)}px`,
                  backgroundColor: d.count > 0 ? scoreColor(d.score) : "var(--bg-elevated)",
                  borderRadius: "3px 3px 0 0",
                  opacity: d.count === 0 ? 0.3 : 0.85,
                  transition: "opacity 0.15s",
                  minHeight: 4,
                }}
                  className={d.count > 0 ? "group-hover:opacity-100" : ""}
                />
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{d.score}</span>
              </Link>
            ))}
          </div>
        </div>

        <CalendarSection monthData={monthData} maxMonthCount={maxMonthCount} dailyData={dailyData} />
      </div>

      {/* ── 메인 컨텐츠: 2컬럼 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

        {/* 왼쪽 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

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
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 14 }}>
                최근 한줄 소감
              </p>
              <RecentReviewsSection items={recentReviews.map((r) => ({
                id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist,
                artist_display: r.albums!.artist_display,
                year: r.albums!.year ?? null, genre: r.albums!.genre ?? null, cover_url: r.albums!.cover_url ?? null,
                score: r.score, one_line_review: r.one_line_review, updated_at: r.updated_at,
              }))} />
            </div>
          )}

          {/* 최근 청음 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 14 }}>
              최근 청음
            </p>
            <RecentListSection items={recent.map((r) => ({
              id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist,
              artist_display: r.albums!.artist_display,
              year: r.albums!.year ?? null, genre: r.albums!.genre ?? null, cover_url: r.albums!.cover_url ?? null,
              score: r.score, one_line_review: r.one_line_review, updated_at: r.updated_at,
            }))} />
          </div>
        </div>

        {/* 오른쪽 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 나중에 들을 앨범 */}
          <WatchlistSection userId={userId} />

          {/* 장르 분포 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>장르</p>
                  {topGenre && (
                    <span style={{ color: "var(--accent)", fontSize: 11 }}>{koGenre(topGenre)} 최다</span>
                  )}
                </div>
                {(totalDomestic > 0 || totalForeign > 0) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--accent)", fontSize: 10 }}>● 국내</span>
                    <span style={{ color: "#6b9ef0", fontSize: 10 }}>● 해외</span>
                  </div>
                )}
              </div>
              {/* 전체 국내/해외 비율 바 */}
              {(totalDomestic > 0 || totalForeign > 0) && (() => {
                const regionTotal = totalDomestic + totalForeign;
                const domPct = (totalDomestic / regionTotal) * 100;
                const forPct = (totalForeign / regionTotal) * 100;
                return (
                  <div>
                    <div style={{ height: 5, backgroundColor: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                      {totalDomestic > 0 && (
                        <div style={{ width: `${domPct}%`, backgroundColor: "var(--accent)", opacity: 0.7 }} />
                      )}
                      {totalForeign > 0 && (
                        <div style={{ width: `${forPct}%`, backgroundColor: "#6b9ef0", opacity: 0.7 }} />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                        국내 {Math.round(domPct)}% · 해외 {Math.round(forPct)}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {genreList.map(({ genre, count, avg: gAvg, domestic, foreign }) => {
                const pct = Math.round((count / total) * 100);
                const barPct = (count / maxGenreCount) * 100;
                const noRegion = count - domestic - foreign;
                const emoji = GENRE_EMOJI[koGenre(genre)];
                return (
                  <div key={genre}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 500 }}>
                        {emoji && <span style={{ marginRight: 5 }}>{emoji}</span>}
                        {koGenre(genre)}
                      </span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: scoreColor(gAvg), fontSize: 11, fontWeight: 700 }}>{gAvg}점</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{count}장 · {pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 7, backgroundColor: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ display: "flex", height: "100%", width: `${barPct}%` }}>
                        {domestic > 0 && (
                          <div style={{ flex: domestic, backgroundColor: "var(--accent)", opacity: 0.8 }} />
                        )}
                        {foreign > 0 && (
                          <div style={{ flex: foreign, backgroundColor: "#6b9ef0", opacity: 0.8 }} />
                        )}
                        {noRegion > 0 && (
                          <div style={{ flex: noRegion, backgroundColor: "var(--text-muted)", opacity: 0.25 }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 취향 궁합 + 멤버 비교 */}
          <ComparisonSection userId={userId} genreEmojiMap={allUserGenreEmojis} />
        </div>
      </div>
      </div>
    </main>
    </div>
  );
}
