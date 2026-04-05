import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import { supabaseServer } from "@/lib/supabase";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";
import { generateBadges } from "@/lib/bio";
import Link from "next/link";
import { ClickableAlbumRow } from "./MembersAlbumModal";

export const metadata: Metadata = {
  title: "청음인",
  description: "아차청음사 청음단 멤버 소개",
};

type RatingRow = { user_id: string; album_id: string; score: number; one_line_review: string | null; albums: { id: string; genre: string | null; artist: string | null } | null };

export default async function MembersPage() {
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

    const badges = generateBadges({
      avg: total > 0 ? avg.toFixed(2) : null,
      topGenre: topGenreEntry?.[0] ?? null,
      topGenreRatio: topGenreEntry ? topGenreEntry[1] / Math.max(total, 1) : 0,
      topArtist: topArtistEntry?.artist ?? null,
      topArtistCount: topArtistEntry?.count ?? 0,
      topArtistAvg: topArtistEntry?.avg ?? 0,
      eightCount,
      total,
      reviewCount,
    });

    return { user, total, avg: total > 0 ? avg : null, reviewCount, eightCount, scoreDist, badges };
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
  const { data: unanimousAlbums } = unanimousAlbumIds.length > 0
    ? await supabaseServer.from("albums").select("id, title, artist, cover_url").in("id", unanimousAlbumIds)
    : { data: [] };
  const unanimousAlbumMap = new Map((unanimousAlbums ?? []).map((a) => [a.id, a]));

  // 취향 충돌 (분산 높은 앨범, 전원 청음 중)
  const controversial = unanimousIds
    .map((a) => {
      const mean = a.avg;
      const variance = a.scores.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / a.scores.length;
      return { ...a, variance };
    })
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 8);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto" }} className="px-4 sm:px-6 pt-8 sm:pt-10 pb-20">
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em", marginBottom: 32 }}>
          청음인 현황
        </p>

        {/* ── 멤버 카드 ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
          {memberStats.map(({ user, total, avg, reviewCount, eightCount, scoreDist, badges }) => {
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
                      <span style={{ fontSize: 28 }}>{user.emoji}</span>
                      <div>
                        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{user.display_name}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{total}장 청음</p>
                      </div>
                    </div>
                  </div>

                  {badges.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                      {badges.map((badge) => (
                        <span key={badge} style={{
                          color: "var(--text-muted)", fontSize: 10,
                          backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                          borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
                        }}>
                          {badge}
                        </span>
                      ))}
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
              {memberStats.map(({ user, total }, i) => (
                <div key={user.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-sub)", fontSize: 13 }}>{i + 1}. {user.emoji} <Link href={`/profile/${user.id}`} style={{ color: "inherit", textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">{user.display_name}</Link></span>
                    <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>{total}장</span>
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
              {[...memberStats].filter(m => m.avg !== null).sort((a, b) => b.avg! - a.avg!).map(({ user, avg }, i) => (
                <div key={user.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-sub)", fontSize: 13 }}>{i + 1}. {user.emoji} <Link href={`/profile/${user.id}`} style={{ color: "inherit", textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">{user.display_name}</Link></span>
                    <span style={{ color: scoreColor(avg), fontSize: 13, fontWeight: 600 }}>{avg!.toFixed(2)}</span>
                  </div>
                  <div style={{ height: 4, backgroundColor: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(avg! / 8) * 100}%`, backgroundColor: scoreColor(avg), borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 공통 청음 매트릭스 ── */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>취향 궁합</p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${pairs.length > 3 ? 2 : 1}, 1fr)`, gap: 12 }}>
            {pairs.sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99)).map(({ a, b, commonCount, diff }) => (
              <div key={`${a.id}-${b.id}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", backgroundColor: "var(--bg-elevated)", borderRadius: 8,
              }}>
                <span style={{ color: "var(--text-sub)", fontSize: 13 }}>
                  {a.emoji} <Link href={`/profile/${a.id}`} style={{ color: "inherit", textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">{a.display_name}</Link>
                  {" × "}
                  {b.emoji} <Link href={`/profile/${b.id}`} style={{ color: "inherit", textDecoration: "none" }} className="hover:text-[var(--accent)] transition-colors">{b.display_name}</Link>
                </span>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11 }}>공통 {commonCount}장</p>
                  {diff !== null && (
                    <p style={{ color: diff < 1.0 ? "var(--accent)" : "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
                      앨범당 {diff.toFixed(2)}점 차이
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 만장일치 명반 ── */}
        {unanimousIds.length > 0 && (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>
              만장일치 명반
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>전원이 청음한 앨범 · 평균 높은 순</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unanimousIds.slice(0, 10).map(({ id, avg, scores }) => {
                const album = unanimousAlbumMap.get(id);
                if (!album) return null;
                return (
                  <ClickableAlbumRow key={id} album={album}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      {album.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14 }}>♪</span></div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{album.artist}</p>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {USERS.map((u) => {
                        const s = albumScoreMaps.get(u.id)?.get(id);
                        return s !== undefined ? (
                          <span key={u.id} style={{ color: scoreColor(s), fontSize: 12, fontWeight: 700 }}>{s}</span>
                        ) : null;
                      })}
                    </div>
                    <span style={{ color: scoreColor(avg), fontWeight: 700, fontSize: 14, width: 32, textAlign: "right", flexShrink: 0 }}>
                      {avg.toFixed(1)}
                    </span>
                  </div>
                  </ClickableAlbumRow>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 취향 충돌 ── */}
        {controversial.length > 0 && (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px 28px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>취향 충돌</p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>전원이 청음했지만 점수 차이가 큰 앨범</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {controversial.map(({ id, avg, variance }) => {
                const album = unanimousAlbumMap.get(id);
                if (!album) return null;
                return (
                  <ClickableAlbumRow key={id} album={album}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                      {album.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={album.cover_url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14 }}>♪</span></div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{album.title}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{album.artist}</p>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {USERS.map((u) => {
                        const s = albumScoreMaps.get(u.id)?.get(id);
                        return s !== undefined ? (
                          <span key={u.id} style={{ color: scoreColor(s), fontSize: 12, fontWeight: 700 }}>{s}</span>
                        ) : null;
                      })}
                    </div>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, width: 40, textAlign: "right", flexShrink: 0 }}>
                      σ {Math.sqrt(variance).toFixed(1)}
                    </span>
                  </div>
                  </ClickableAlbumRow>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
