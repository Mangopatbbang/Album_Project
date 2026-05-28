import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase";
import { scoreColor } from "@/lib/score";
import HallOfFameSection from "@/components/profile/HallOfFameSection";
import ArtistSection from "@/components/profile/ArtistSection";
import { RecentListSection, RecentReviewsSection } from "@/components/profile/RecentRatingsSection";
import { GENRE_COLOR } from "@/lib/bio";
import ProfileCaptureButton from "@/components/profile/ProfileCaptureButton";
import ProfileEditButton from "@/components/profile/ProfileEditButton";
import MobileLogoutButton from "@/components/profile/MobileLogoutButton";
import AvatarWithLightbox from "@/components/profile/AvatarWithLightbox";
import WatchlistSection from "@/components/profile/WatchlistSection";
import EncounterSection, { type EncounterAlbum } from "@/components/profile/EncounterSection";
import ComparisonSection from "@/components/profile/ComparisonSection";
import CalendarSection from "@/components/profile/CalendarSection";
import LikedTracksButton from "@/components/profile/LikedTracksButton";
import ReportUserButton from "@/components/profile/ReportUserButton";
import MobileSettingsButton from "@/components/profile/MobileSettingsButton";
import { fetchProfileRatings, fetchAllUserGenreEmojis, fetchAllUserAvatarUrls, type ProfileRatingRow } from "@/lib/stats";
import ListeningLogsSection from "@/components/profile/ListeningLogsSection";
import InsightSection from "@/components/profile/InsightSection";
import TimelineSection from "@/components/profile/TimelineSection";
import ProfileDiaryButton from "@/components/profile/ProfileDiaryButton";
import type { DayAlbum } from "@/components/profile/CalendarSection";

const getCommunityRatings = unstable_cache(
  async (userId: string) => {
    const { data: myAlbums } = await supabaseServer
      .from("ratings")
      .select("album_id")
      .eq("user_id", userId);
    const ids = (myAlbums ?? []).map((r: { album_id: string }) => r.album_id);
    if (!ids.length) return [] as { album_id: string; score: number }[];
    const { data } = await supabaseServer
      .from("ratings")
      .select("album_id, score")
      .in("album_id", ids)
      .neq("user_id", userId);
    return (data ?? []) as { album_id: string; score: number }[];
  },
  ["community-ratings"],
  { tags: ["profile-ratings"], revalidate: 3600 }
);

const getUserListeningLogs = unstable_cache(
  async (userId: string) => {
    const { data } = await supabaseServer
      .from("listening_logs")
      .select("id, listened_at, context, note, albums(id, title, artist, cover_url)")
      .eq("user_id", userId)
      .order("listened_at", { ascending: false })
      .limit(20);
    return data ?? [];
  },
  ["user-listening-logs"],
  { tags: ["user-logs"], revalidate: 3600 }
);

const getUserPlaylists = unstable_cache(
  async (userId: string) => {
    const { data } = await supabaseServer
      .from("playlists")
      .select("id, title, created_at, playlist_entries(id, sort_order, albums(id, cover_url))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);
    return data ?? [];
  },
  ["user-playlists"],
  { tags: ["user-playlists"], revalidate: 3600 }
);

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const { data: dbUser } = await supabaseServer
    .from("users")
    .select("display_name")
    .eq("id", userId)
    .single();
  if (!dbUser) return {};
  return {
    title: `${dbUser.display_name}의 청음 기록`,
    description: `${dbUser.display_name}의 아차청음사 청음 기록`,
  };
}

type RatingRow = ProfileRatingRow;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  // DB에서 최신 프로필 정보 가져오기 (avatar_url, display_name, emoji 반영)
  const { data: dbUser } = await supabaseServer
    .from("users")
    .select("id, display_name, emoji, avatar_url, bio")
    .eq("id", userId)
    .single();

  if (!dbUser) notFound();

  const displayName = (dbUser as { display_name?: string })?.display_name ?? userId;
  const displayEmoji = (dbUser as { emoji?: string })?.emoji ?? "🎵";
  const avatarUrl = (dbUser as { avatar_url?: string | null })?.avatar_url ?? null;
  const bio = (dbUser as { bio?: string | null })?.bio ?? null;

  // 전체 데이터 병렬 fetch (모두 캐시 처리됨)
  const [allRawRatings, allUserTopGenres, allUserAvatarUrls, listeningLogsData, playlistsData, communityRatings] = await Promise.all([
    fetchProfileRatings(userId),
    fetchAllUserGenreEmojis(),
    fetchAllUserAvatarUrls(),
    getUserListeningLogs(userId),
    getUserPlaylists(userId),
    getCommunityRatings(userId),
  ]);

  type LogAlbum = { id: string; title: string; artist: string; cover_url: string | null };
  type ListeningLog = { id: string; listened_at: string; context: string[] | null; note: string | null; albums: LogAlbum | null };
  const listeningLogs = listeningLogsData as unknown as ListeningLog[];

  type PlaylistEntry = { id: string; sort_order: number; albums: { id: string; cover_url: string | null } | null };
  type UserPlaylist = { id: string; title: string; created_at: string; playlist_entries: PlaylistEntry[] };
  const userPlaylists = playlistsData as unknown as UserPlaylist[];

  const validRatings = allRawRatings.filter((r) => r.albums !== null);

  const communityScoresByAlbum = new Map<string, number[]>();
  for (const r of communityRatings) {
    const arr = communityScoresByAlbum.get(r.album_id) ?? [];
    arr.push(r.score);
    communityScoresByAlbum.set(r.album_id, arr);
  }
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
  const dailyData: Record<string, DayAlbum[]> = {};
  for (const r of validRatings) {
    const key = r.updated_at.slice(0, 10); // "YYYY-MM-DD"
    if (!dailyData[key]) dailyData[key] = [];
    dailyData[key].push({
      id: r.albums!.id,
      title: r.albums!.title,
      artist: r.albums!.artist,
      artist_display: r.albums!.artist_display,
      cover_url: r.albums!.cover_url ?? null,
      score: r.score,
      is_encounter: !!r.encounter_date,
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
    const g = r.albums?.genre ?? "Other";
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

  // 상위 2 장르명
  const topGenres = genreList.slice(0, 2).map(({ genre }) => genre);

  // 인연으로 만난 앨범
  const encounterAlbums: EncounterAlbum[] = validRatings
    .filter((r) => r.encounter_date)
    .map((r) => ({
      id: r.albums!.id,
      title: r.albums!.title,
      artist: r.albums!.artist,
      artist_display: r.albums!.artist_display,
      genre: r.albums!.genre ?? null,
      cover_url: r.albums!.cover_url ?? null,
      score: r.score,
      encounter_date: r.encounter_date!,
    }));

  // 커뮤니티 데이터 맵 (albumId → community info)
  const communityMap = new Map<string, { commCount: number; commAvg: number | null }>(
    validRatings.map((r) => r.albums!.id).map((albumId) => {
      const commScores = communityScoresByAlbum.get(albumId) ?? [];
      const commAvg = commScores.length > 0 ? commScores.reduce((s, n) => s + n, 0) / commScores.length : null;
      return [albumId, { commCount: commScores.length, commAvg }];
    })
  );

  // 이견 앨범: |내 점수 - 커뮤니티 평균| >= 2.0, 커뮤니티 평가자 >= 2명
  type InsightAlbum = { id: string; title: string; artist: string; artist_display?: string; cover_url: string | null; score: number; commAvg: number; diff: number };
  const disagreeAlbums: InsightAlbum[] = validRatings
    .flatMap((r) => {
      const comm = communityMap.get(r.albums!.id);
      if (!comm || comm.commCount < 2 || comm.commAvg === null) return [];
      const diff = r.score - comm.commAvg;
      if (Math.abs(diff) < 2.0) return [];
      const item: InsightAlbum = { id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist, artist_display: r.albums!.artist_display, cover_url: r.albums!.cover_url ?? null, score: r.score, commAvg: comm.commAvg, diff };
      return [item];
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 6);

  // 숨은 명반 (개인): 내 점수 >= 7, 커뮤니티 평가자 <= 1명
  type HiddenGemAlbum = { id: string; title: string; artist: string; artist_display?: string; cover_url: string | null; score: number };
  const personalHiddenGems: HiddenGemAlbum[] = validRatings
    .filter((r) => {
      const comm = communityMap.get(r.albums!.id);
      return r.score >= 7 && (comm === undefined || comm.commCount <= 1);
    })
    .map((r) => ({ id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist, artist_display: r.albums!.artist_display, cover_url: r.albums!.cover_url ?? null, score: r.score }))
    .slice(0, 8);

  // 명예의 전당 (8점)
  const hallOfFame = validRatings.filter((r) => r.score === 8);

  // 최근 20개
  const recent = validRatings.slice(0, 20);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>

    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px calc(80px + env(safe-area-inset-bottom))" }}>

      <div id="profile-card" className="flex flex-col" style={{ backgroundColor: "var(--bg)" }}>

      {/* ── 프로필 헤더 (압축) ── */}
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        marginBottom: 16,
        padding: "20px 24px",
      }}>
        {/* 모바일: 아바타+이름+버튼 한 줄, 스탯 한 줄, 뱃지 한 줄 */}
        <div className="flex items-start sm:hidden" style={{ gap: 12 }}>
          <AvatarWithLightbox avatarUrl={avatarUrl} emoji={displayEmoji} displayName={displayName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
              <p style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.03em", fontSize: 18, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <ReportUserButton targetUserId={userId} />
                <ProfileDiaryButton userId={userId} />
                <MobileSettingsButton userId={userId} initialDisplayName={displayName} initialEmoji={displayEmoji} initialAvatarUrl={avatarUrl} initialBio={bio} />
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", marginTop: 5 }}>
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
            {bio && (
              <p style={{ color: "var(--text-sub)", fontSize: 12, marginTop: 6, lineHeight: 1.5, wordBreak: "keep-all" }}>
                {bio}
              </p>
            )}
            {topGenres.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
                {topGenres.map((g) => {
                  const gColor = GENRE_COLOR[g] ?? "#94a3b8";
                  return (
                    <span key={g} style={{
                      fontSize: 10, fontWeight: 600,
                      backgroundColor: `${gColor}1a`, color: gColor,
                      border: `1px solid ${gColor}40`,
                      borderRadius: 4, padding: "2px 6px",
                    }}>{g}</span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 데스크탑: 기존 레이아웃 */}
        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <AvatarWithLightbox avatarUrl={avatarUrl} emoji={displayEmoji} displayName={displayName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "var(--text)", fontWeight: 700, letterSpacing: "-0.03em", fontSize: 20 }}>
              {displayName}
            </p>
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
            {bio && (
              <p style={{ color: "var(--text-sub)", fontSize: 12, marginTop: 6, lineHeight: 1.5, wordBreak: "keep-all" }}>
                {bio}
              </p>
            )}
            {topGenres.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {topGenres.map((g) => {
                  const gColor = GENRE_COLOR[g] ?? "#94a3b8";
                  return (
                    <span key={g} style={{
                      fontSize: 11, fontWeight: 600,
                      backgroundColor: `${gColor}1a`, color: gColor,
                      border: `1px solid ${gColor}40`,
                      borderRadius: 4, padding: "2px 7px",
                    }}>{g}</span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-start sm:self-start">
            <ReportUserButton targetUserId={userId} />
            <MobileLogoutButton userId={userId} />
            <ProfileCaptureButton targetId="profile-card" />
            <ProfileDiaryButton userId={userId} />
            <ProfileEditButton userId={userId} initialDisplayName={displayName} initialEmoji={displayEmoji} initialAvatarUrl={avatarUrl} />
          </div>
        </div>
      </div>

      {/* ── 첫 방문 가이드 (청음 기록 없을 때) ── */}
      {total === 0 && (
        <div style={{
          backgroundColor: "var(--bg-card)", border: "1px dashed var(--border)",
          borderRadius: 12, padding: "32px 24px", marginBottom: 16,
          textAlign: "center",
        }}>
          <p style={{ fontSize: 28, marginBottom: 12 }}>♪</p>
          <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
            아직 청음 기록이 없어요
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            음반고에서 앨범을 찾아 점수를 매겨보세요.<br />
            평가가 쌓이면 나만의 취향 지도가 그려져요.
          </p>
          <a
            href="/albums"
            style={{
              display: "inline-block",
              backgroundColor: "var(--accent)", color: "var(--bg)",
              fontWeight: 700, fontSize: 13, borderRadius: 8,
              padding: "10px 24px", textDecoration: "none",
            }}
          >
            음반고 둘러보기 →
          </a>
        </div>
      )}

      {/* ── 명반전 ── */}
      <div style={{
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
        border: "1px solid rgba(232,213,163,0.3)",
        boxShadow: hallOfFame.length > 0 ? "0 2px 24px rgba(232,213,163,0.07)" : "none",
      }}>
        {/* 황금 상단 라인 */}
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent 0%, rgba(232,213,163,0.7) 30%, rgba(232,213,163,0.9) 50%, rgba(232,213,163,0.7) 70%, transparent 100%)", animation: "hofLineDraw 1.2s ease-out" }} />
        <style>{`@keyframes hofLineDraw { 0% { clip-path: inset(0 50% 0 50%); } 100% { clip-path: inset(0 0% 0 0%); } }`}</style>
        {/* 헤더 */}
        <div style={{
          background: "linear-gradient(180deg, rgba(232,213,163,0.09) 0%, rgba(232,213,163,0.03) 100%)",
          borderBottom: "1px solid rgba(232,213,163,0.12)",
          padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <span style={{ color: "var(--text)", fontWeight: 800, fontSize: 15, letterSpacing: "0.04em" }}>명반전</span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: hallOfFame.length >= 12 ? "var(--accent)" : "var(--text-muted)",
            backgroundColor: "rgba(232,213,163,0.08)",
            border: "1px solid rgba(232,213,163,0.2)",
            borderRadius: 4, padding: "1px 8px",
            letterSpacing: "0.02em",
          }}>
            {hallOfFame.length} / 12
          </span>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", padding: "20px 24px" }}>
          {hallOfFame.length > 0 ? (
            <HallOfFameSection
              albums={hallOfFame.map((r) => ({ ...r.albums!, score: r.score }))}
              count={hallOfFame.length}
              inline
            />
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "8px 0", fontStyle: "italic" }}>
              아직 인연이 닿지 않았습니다
            </p>
          )}
        </div>
      </div>

      {/* ── InsightSection: 이견 앨범 + 숨은 명반 ── */}
      <div data-tour="profile-insight" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <InsightSection disagreeAlbums={disagreeAlbums} personalHiddenGems={personalHiddenGems} />
      </div>

      {/* ── 점수 분포 + 청음 캘린더 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* 점수 분포 — 클릭하면 음반고로 이동 */}
        <div data-tour="profile-score-dist" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4 sm:p-5">
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* 왼쪽 — 활동 내역 */}
        <div className="order-2 lg:order-none" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 아티스트 TOP 5 */}
          {artistByCount.length > 0 && (
            <ArtistSection
              byCount={artistByCount}
              byAvg={artistByAvg}
              maxCount={maxArtistCount}
              maxAvg={maxArtistAvg}
            />
          )}

          {/* 최근 청음 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 14 }}>
              최근 청음
            </p>
            <RecentListSection items={recent.map((r) => ({
              id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist,
              artist_display: r.albums!.artist_display,
              genre: r.albums!.genre ?? null, cover_url: r.albums!.cover_url ?? null,
              score: r.score, one_line_review: r.one_line_review, updated_at: r.updated_at,
            }))} />
          </div>

          {/* 재청음 기록 */}
          <ListeningLogsSection logs={listeningLogs} />

          {/* 청음집 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
                청음집
              </p>
              {userPlaylists.length > 0 && (
                <Link href="/themes" style={{ color: "var(--text-muted)", fontSize: 11 }} className="hover:text-[var(--accent)] transition-colors">
                  전체 →
                </Link>
              )}
            </div>
            {userPlaylists.length === 0 ? (
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>
                  아직 만든 청음집이 없어요
                </p>
                <Link href="/themes" style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
                  청음집 만들러 가기 →
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {userPlaylists.map((pl) => {
                  const entries = [...pl.playlist_entries].sort((a, b) => a.sort_order - b.sort_order);
                  const covers = entries.slice(0, 4).map((e) => e.albums?.cover_url ?? null);
                  const count = pl.playlist_entries.length;
                  return (
                    <Link
                      key={pl.id}
                      href={`/playlist/${pl.id}`}
                      style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none" }}
                      className="hover:opacity-75 transition-opacity"
                    >
                      <div style={{
                        flexShrink: 0, width: 40, height: 40, borderRadius: 6,
                        overflow: "hidden", display: "grid",
                        gridTemplateColumns: "1fr 1fr", gap: 1,
                        backgroundColor: "var(--bg-elevated)",
                      }}>
                        {covers.map((c, i) =>
                          c ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={c} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div key={i} style={{ backgroundColor: "var(--bg-elevated)" }} />
                          )
                        )}
                        {covers.length < 4 && Array.from({ length: 4 - covers.length }).map((_, i) => (
                          <div key={`empty-${i}`} style={{ backgroundColor: "var(--bg-elevated)" }} />
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.title}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1 }}>{count}장</p>
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: 16, flexShrink: 0 }}>›</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* 최근 한줄 소감 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 14 }}>
              최근 한줄 소감
            </p>
            {recentReviews.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 12, opacity: 0.5, fontStyle: "italic" }}>아직 한줄 소감이 없어요</p>
            ) : (
              <RecentReviewsSection items={recentReviews.map((r) => ({
                id: r.albums!.id, title: r.albums!.title, artist: r.albums!.artist,
                artist_display: r.albums!.artist_display,
                genre: r.albums!.genre ?? null, cover_url: r.albums!.cover_url ?? null,
                score: r.score, one_line_review: r.one_line_review, updated_at: r.updated_at,
              }))} />
            )}
          </div>

          {/* 인연으로 만난 앨범 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "var(--text-sub)", fontSize: 13 }}>◇</span>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>인연으로 만난 앨범</p>
              {encounterAlbums.length > 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{encounterAlbums.length}장</span>
              )}
            </div>
            <EncounterSection albums={encounterAlbums} />
          </div>
        </div>

        {/* 오른쪽 — 통계 & 분석 */}
        <div className="order-1 lg:order-none" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 나중에 들을 앨범 */}
          <div data-tour="profile-watchlist"><WatchlistSection userId={userId} /></div>

          {/* 장르 분포 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>장르</p>
                  {topGenre && (
                    <span style={{ color: "var(--accent)", fontSize: 11 }}>{topGenre} 최다</span>
                  )}
                </div>
                {(totalDomestic > 0 || totalForeign > 0) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--accent)", fontSize: 10 }}>● 국내</span>
                    <span style={{ color: "var(--color-foreign)", fontSize: 10 }}>● 해외</span>
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
                        <div style={{ width: `${forPct}%`, backgroundColor: "var(--color-foreign)", opacity: 0.7 }} />
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
                const gDisplay = genre;
                const gColor = GENRE_COLOR[gDisplay] ?? "#94a3b8";
                return (
                  <div key={genre}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: gColor }}>{gDisplay}</span>
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
                          <div style={{ flex: foreign, backgroundColor: "var(--color-foreign)", opacity: 0.8 }} />
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
          <div data-tour="profile-comparison"><ComparisonSection userId={userId} topGenreMap={allUserTopGenres} avatarMap={allUserAvatarUrls} /></div>

          {/* 청음 연대기 — admin only (데이터 충분히 쌓이면 공개) */}
          <TimelineSection userId={userId} />

        </div>
      </div>
      </div>
    </main>
    </div>
  );
}
