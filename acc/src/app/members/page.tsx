import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { scoreColor } from "@/lib/score";
import { koGenre, GENRE_COLOR } from "@/lib/bio";
import Link from "next/link";
import { PairsSection, UnanimousSection, ControversialSection, type PairData, type AlbumSectionData } from "./MembersSections";
import { resolveArtistDisplay } from "@/lib/artistDisplay";
import { fetchAllUserAvatarUrls, fetchAllUsers } from "@/lib/stats";
import UserAvatar from "@/components/ui/UserAvatar";

export const metadata: Metadata = {
  title: "청음인",
  description: "아차청음사 청음단 멤버 소개",
};

type RatingRow = { user_id: string; album_id: string; score: number; one_line_review: string | null; albums: { id: string; genre: string | null; artist: string | null } | null };

export default async function MembersPage() {
  const [avatarMap, USERS] = await Promise.all([fetchAllUserAvatarUrls(), fetchAllUsers()]);

  // Supabase 1000행 제한 우회 — 페이지네이션으로 전체 수집
  const allRaw: RatingRow[] = [];
  for (let page = 0; ; page++) {
    const { data: pageData } = await supabaseServer
      .from("ratings")
      .select("user_id, album_id, score, one_line_review, albums(id, genre, artist)")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!pageData || pageData.length === 0) break;
    allRaw.push(...(pageData as unknown as RatingRow[]));
    if (pageData.length < 1000) break;
  }

  // 실제로 앨범이 존재하는 평점만 사용 (프로필 페이지와 동일 기준)
  const ratings = allRaw.filter((r) => r.albums !== null);

  // 멤버별 통계
  const memberStats = USERS.map((user) => {
    const mine = ratings.filter((r) => r.user_id === user.id);
    const scores = mine.map((r) => r.score);
    const total = scores.length;
    const avg = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
    const reviewCount = mine.filter((r) => r.one_line_review?.trim()).length;
    const eightCount = mine.filter((r) => r.score === 8).length;

    // 장르 (album join 없이 score 분포만)
    const scoreDist = Array.from({ length: 8 }, (_, i) => ({
      score: i + 1,
      count: scores.filter((s) => s === i + 1).length,
    }));

    // 장르/아티스트 집계
    const genreMap = new Map<string, number>();
    const artistMap = new Map<string, { count: number; total: number }>();
    for (const r of mine) {
      if (r.albums?.genre) genreMap.set(r.albums.genre, (genreMap.get(r.albums.genre) ?? 0) + 1);
      if (r.albums?.artist) {
        const prev = artistMap.get(r.albums.artist) ?? { count: 0, total: 0 };
        artistMap.set(r.albums.artist, { count: prev.count + 1, total: prev.total + r.score });
      }
    }
    const topGenreEntry = [...genreMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topArtistEntry = [...artistMap.entries()]
      .map(([artist, { count, total: t }]) => ({ artist, count, avg: t / count }))
      .sort((a, b) => b.count - a.count)[0];

    const topGenres = [...genreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([g]) => koGenre(g));

    return { user, total, avg: total > 0 ? avg : null, reviewCount, eightCount, scoreDist, topGenres };
  }).sort((a, b) => b.total - a.total);

  const maxTotal = memberStats[0]?.total ?? 1;

  // 멤버 간 공통 청음 매트릭스
  const albumScoreMaps = new Map<string, Map<string, number>>();
  for (const user of USERS) {
    const map = new Map<string, number>();
    ratings.filter((r) => r.user_id === user.id).forEach((r) => map.set(r.album_id, r.score));
    albumScoreMaps.set(user.id, map);
  }

  const pairs = [];
  for (let i = 0; i < USERS.length; i++) {
    for (let j = i + 1; j < USERS.length; j++) {
      const a = USERS[i];
      const b = USERS[j];
      const mapA = albumScoreMaps.get(a.id)!;
      const mapB = albumScoreMaps.get(b.id)!;
      const commonIds = [...mapA.keys()].filter((id) => mapB.has(id));
      const commonCount = commonIds.length;
      if (commonCount === 0) { pairs.push({ a, b, commonCount, diff: null }); continue; }
      // MAE: 앨범별 절댓값 차이의 평균
      const mae = commonIds.reduce((s, id) => s + Math.abs(mapA.get(id)! - mapB.get(id)!), 0) / commonCount;
      pairs.push({ a, b, commonCount, diff: parseFloat(mae.toFixed(2)) });
    }
  }

  // 만장일치 앨범 (전원 청음)
  const allUserIds = USERS.map((u) => u.id);
  const albumRaterMap = new Map<string, { userIds: Set<string>; scores: number[] }>();
  for (const r of ratings) {
    if (!albumRaterMap.has(r.album_id)) albumRaterMap.set(r.album_id, { userIds: new Set(), scores: [] });
    const entry = albumRaterMap.get(r.album_id)!;
    entry.userIds.add(r.user_id);
    entry.scores.push(r.score);
  }

  const unanimousIds = [...albumRaterMap.entries()]
    .filter(([, v]) => allUserIds.every((uid) => v.userIds.has(uid)))
    .map(([id, v]) => ({ id, avg: v.scores.reduce((a, b) => a + b, 0) / v.scores.length, scores: v.scores }))
    .sort((a, b) => b.avg - a.avg);

  // 만장일치 앨범 커버/제목 가져오기
  const unanimousAlbumIds = unanimousIds.slice(0, 10).map((a) => a.id);
  const { data: unanimousAlbumsRaw } = unanimousAlbumIds.length > 0
    ? await supabaseServer.from("albums").select("id, title, artist, use_artist_variant, cover_url, spotify_id").in("id", unanimousAlbumIds)
    : { data: [] };
  const unanimousAlbums = await resolveArtistDisplay(unanimousAlbumsRaw ?? []);
  const unanimousAlbumMap = new Map(unanimousAlbums.map((a) => [a.id, a]));

  // 취향 충돌 (분산 높은 앨범, 전원 청음 중)
  const controversial = unanimousIds
    .map((a) => {
      const mean = a.avg;
      const variance = a.scores.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / a.scores.length;
      return { ...a, variance };
    })
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 8);

  // 클라이언트 컴포넌트용 직렬화 데이터
  const pairsData: PairData[] = pairs.sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99));

  const toAlbumSectionData = (items: typeof unanimousIds, withVariance = false): AlbumSectionData[] =>
    items.map(({ id, avg, scores, ...rest }) => {
      const album = unanimousAlbumMap.get(id);
      if (!album) return null;
      const userScores = USERS
        .map((u) => { const s = albumScoreMaps.get(u.id)?.get(id); return s !== undefined ? { userId: u.id, score: s } : null; })
        .filter(Boolean) as { userId: string; score: number }[];
      return {
        id,
        title: album.title,
        artist: album.artist,
        artist_display: album.artist_display ?? album.artist,
        cover_url: album.cover_url ?? null,
        spotify_id: (album as { spotify_id?: string | null }).spotify_id ?? null,
        avg,
        ...(withVariance ? { variance: (rest as { variance?: number }).variance } : {}),
        userScores,
      };
    }).filter(Boolean) as AlbumSectionData[];

  const unanimousData = toAlbumSectionData(unanimousIds.slice(0, 10));
  const controversialData = toAlbumSectionData(controversial as typeof unanimousIds, true);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em", marginBottom: 32 }}>
          청음인 현황
        </p>

        {/* ── 멤버 카드: 모바일 리스트 ── */}
        <div className="sm:hidden flex flex-col gap-2 mb-8">
          {memberStats.map(({ user, total, avg, topGenres }) => (
            <Link key={user.id} href={`/profile/${user.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}
                className="active:opacity-70 transition-opacity"
              >
                <UserAvatar avatarUrl={avatarMap[user.id]} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 14 }}>{user.display_name}</p>
                  <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                    {topGenres.map((g) => {
                      const gColor = GENRE_COLOR[g] ?? "#94a3b8";
                      return (
                        <span key={g} style={{
                          fontSize: 10, fontWeight: 600,
                          backgroundColor: `${gColor}1a`, color: gColor,
                          border: `1px solid ${gColor}40`,
                          borderRadius: 4, padding: "1px 6px",
                        }}>{g}</span>
                      );
                    })}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ color: avg !== null ? scoreColor(avg) : "var(--text-muted)", fontWeight: 700, fontSize: 16 }}>
                    {avg !== null ? avg.toFixed(2) : "—"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1 }}>{total}장</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── 멤버 카드: 데스크탑 그리드 ── */}
        <div className="hidden sm:grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
          {memberStats.map(({ user, total, avg, reviewCount, eightCount, scoreDist, topGenres }) => {
            const maxDist = Math.max(...scoreDist.map((d) => d.count), 1);
            return (
              <Link key={user.id} href={`/profile/${user.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "24px 28px", cursor: "pointer",
                }}
                  className="transition-all hover:border-[var(--border-light)] hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <UserAvatar avatarUrl={avatarMap[user.id]} size={40} />
                      <div>
                        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{user.display_name}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{total}장 청음</p>
                      </div>
                    </div>
                  </div>

                  {topGenres.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                      {topGenres.map((g) => {
                        const gColor = GENRE_COLOR[g] ?? "#94a3b8";
                        return (
                          <span key={g} style={{
                            fontSize: 10, fontWeight: 600,
                            backgroundColor: `${gColor}1a`, color: gColor,
                            border: `1px solid ${gColor}40`,
                            borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap",
                          }}>{g}</span>
                        );
                      })}
                    </div>
                  )}

                  {/* 점수 분포 미니 바 */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32, marginBottom: 14 }}>
                    {scoreDist.map((d) => (
                      <div key={d.score} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{
                          width: "100%",
                          height: `${(d.count / maxDist) * 28 + (d.count > 0 ? 2 : 0)}px`,
                          backgroundColor: d.count > 0 ? scoreColor(d.score) : "var(--bg-elevated)",
                          borderRadius: "2px 2px 0 0",
                          opacity: d.count === 0 ? 0.2 : 1,
                        }} />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 16 }}>
                    <div>
                      <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>AVG</p>
                      <p style={{ color: scoreColor(avg), fontWeight: 700, fontSize: 16 }}>
                        {avg !== null ? avg.toFixed(2) : "—"}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>한줄 소감</p>
                      <p style={{ color: "var(--text-sub)", fontWeight: 600, fontSize: 16 }}>{reviewCount}</p>
                    </div>
                    <div>
                      <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>명반</p>
                      <p style={{ color: "var(--text-sub)", fontWeight: 600, fontSize: 16 }}>{eightCount}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── 랭킹 ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* 청음 수 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>청음 수 랭킹</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {memberStats.map(({ user, total, topGenres }, i) => (
                <div key={user.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-sub)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>{i + 1}. <UserAvatar avatarUrl={avatarMap[user.id]} size={18} /> <Link href={`/profile/${user.id}`} style={{ color: "inherit", textDecoration: "none" }} className="truncate hover:text-[var(--accent)] transition-colors">{user.display_name}</Link>{topGenres.map((g) => { const gColor = GENRE_COLOR[g] ?? "#94a3b8"; return <span key={g} style={{ fontSize: 10, fontWeight: 600, backgroundColor: `${gColor}1a`, color: gColor, border: `1px solid ${gColor}40`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>{g}</span>; })}</span>
                    <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{total}장</span>
                  </div>
                  <div style={{ height: 4, backgroundColor: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(total / maxTotal) * 100}%`, backgroundColor: "var(--accent)", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 평균 점수 */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>평균 점수 랭킹</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[...memberStats].filter(m => m.avg !== null).sort((a, b) => b.avg! - a.avg!).map(({ user, avg, topGenres }, i) => (
                <div key={user.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-sub)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>{i + 1}. <UserAvatar avatarUrl={avatarMap[user.id]} size={18} /> <Link href={`/profile/${user.id}`} style={{ color: "inherit", textDecoration: "none" }} className="truncate hover:text-[var(--accent)] transition-colors">{user.display_name}</Link>{topGenres.map((g) => { const gColor = GENRE_COLOR[g] ?? "#94a3b8"; return <span key={g} style={{ fontSize: 10, fontWeight: 600, backgroundColor: `${gColor}1a`, color: gColor, border: `1px solid ${gColor}40`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>{g}</span>; })}</span>
                    <span style={{ color: scoreColor(avg), fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{avg!.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 4, backgroundColor: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(avg! / 8) * 100}%`, backgroundColor: scoreColor(avg), borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <PairsSection pairs={pairsData} avatarMap={avatarMap} />
        <UnanimousSection albums={unanimousData} />
        <ControversialSection albums={controversialData} />
      </main>
    </div>
  );
}
