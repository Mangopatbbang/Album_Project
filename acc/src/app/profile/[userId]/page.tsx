import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { USERS } from "@/types";
import { scoreColor } from "@/lib/score";
import Header from "@/components/layout/Header";

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

function median(sorted: number[]) {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = USERS.find((u) => u.id === userId);
  if (!user) notFound();

  // 내 전체 평점
  const { data: rawRatings } = await supabaseServer
    .from("ratings")
    .select("score, one_line_review, updated_at, albums(id, title, artist, year, genre, cover_url)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(5000);

  const ratings = (rawRatings ?? []) as unknown as RatingRow[];
  const validRatings = ratings.filter((r) => r.albums !== null);
  const scores = validRatings.map((r) => r.score).sort((a, b) => a - b);
  const total = validRatings.length;
  const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(2) : null;
  const maxScore = total > 0 ? Math.max(...scores) : null;
  const minScore = total > 0 ? Math.min(...scores) : null;
  const med = median(scores);

  // 점수 분포 (1~8)
  const scoreDist = Array.from({ length: 8 }, (_, i) => ({
    score: i + 1,
    count: scores.filter((s) => s === i + 1).length,
  }));
  const maxDistCount = Math.max(...scoreDist.map((d) => d.count), 1);

  // 장르 분포
  const genreMap = new Map<string, number>();
  for (const r of validRatings) {
    const g = r.albums?.genre ?? "기타";
    genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
  }
  const genreList = [...genreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxGenreCount = genreList[0]?.[1] ?? 1;
  const topGenre = genreList[0]?.[0] ?? null;

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

  // 비교용 전체 평점 맵 (페이지네이션으로 1000개 제한 우회)
  const myAlbumScoreMap = new Map<string, number>();
  for (let page = 0; ; page++) {
    const { data: pageData } = await supabaseServer
      .from("ratings")
      .select("album_id, score")
      .eq("user_id", userId)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!pageData || pageData.length === 0) break;
    for (const r of pageData) myAlbumScoreMap.set(r.album_id, r.score);
    if (pageData.length < 1000) break;
  }

  const comparisons = otherUsers.map((other) => {
    const theirRatings = (otherRatings ?? []).filter((r) => r.user_id === other.id);
    const common = theirRatings.filter((r) => myAlbumScoreMap.has(r.album_id));
    const commonCount = common.length;
    if (commonCount === 0) return { user: other, commonCount: 0, diff: null };

    const myAvgCommon = common.reduce((s, r) => s + (myAlbumScoreMap.get(r.album_id) ?? 0), 0) / commonCount;
    const theirAvgCommon = common.reduce((s, r) => s + r.score, 0) / commonCount;
    const diff = parseFloat((myAvgCommon - theirAvgCommon).toFixed(2));
    return { user: other, commonCount, diff };
  });

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
    <Header />
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>

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
          <div>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 24, letterSpacing: "-0.03em" }}>
              {user.display_name}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              총 <span style={{ color: "var(--accent)", fontWeight: 600 }}>{total}</span>장 청음
            </p>
          </div>
        </div>

        {/* 핵심 스탯 4개 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "평균 점수", value: avg ?? "—", unit: "/ 8", colorVal: avg },
            { label: "최고점", value: maxScore ?? "—", unit: "점", colorVal: maxScore },
            { label: "최저점", value: minScore ?? "—", unit: "점", colorVal: minScore },
            { label: "중간값", value: med ?? "—", unit: "점", colorVal: med },
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

      {/* 점수 분포 */}
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px 28px",
        marginBottom: 20,
      }}>
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

      {/* 메인 컨텐츠: 2컬럼 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

        {/* 왼쪽 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 명예의 전당 */}
          {hallOfFame.length > 0 && (
            <div style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px 28px",
            }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>
                명반전
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>
                8점 · {hallOfFame.length}장
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {hallOfFame.map((r) => (
                  <div key={r.albums!.id} style={{ position: "relative" }} title={`${r.albums!.title} — ${r.albums!.artist}`}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: 6,
                      overflow: "hidden",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                    }}>
                      {r.albums!.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.albums!.cover_url} alt={r.albums!.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: 20 }}>♪</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recent.map((r) => (
                <div key={r.albums!.id + r.updated_at} className="rating-row" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 10px",
                  borderRadius: 8,
                  transition: "background 0.15s",
                }}>
                  {/* 커버 */}
                  <div style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 4,
                    overflow: "hidden",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                  }}>
                    {r.albums!.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.albums!.cover_url} alt={r.albums!.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 14 }}>♪</span>
                      </div>
                    )}
                  </div>

                  {/* 앨범 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.albums!.title}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1 }}>
                      {r.albums!.artist}
                      {r.albums!.genre && <span style={{ marginLeft: 6, opacity: 0.7 }}>{r.albums!.genre}</span>}
                    </p>
                  </div>

                  {/* 날짜 */}
                  <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>
                    {new Date(r.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  </span>

                  {/* 점수 */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: "var(--bg-elevated)",
                    border: `1px solid var(--border)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ color: scoreColor(r.score), fontWeight: 700, fontSize: 14 }}>
                      {r.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
              최다 <span style={{ color: "var(--accent)" }}>{topGenre}</span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {genreList.map(([genre, count]) => (
                <div key={genre}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-sub)", fontSize: 12 }}>{genre}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{count}장</span>
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

          {/* 멤버 비교 */}
          <div style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 28px",
          }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
              VS MEMBERS
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {comparisons.map(({ user: other, commonCount, diff }) => (
                <div key={other.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "var(--text-sub)", fontSize: 13 }}>
                      {other.emoji} {other.display_name}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>공통 {commonCount}장</span>
                  </div>
                  {diff !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, backgroundColor: "var(--bg-elevated)", borderRadius: 2, position: "relative", overflow: "visible" }}>
                        {/* 중앙 기준선 */}
                        <div style={{
                          position: "absolute",
                          left: "50%",
                          top: -2,
                          width: 1,
                          height: 8,
                          backgroundColor: "var(--border-light)",
                          transform: "translateX(-50%)",
                        }} />
                        {/* 차이 바 */}
                        <div style={{
                          position: "absolute",
                          height: "100%",
                          backgroundColor: diff > 0 ? "var(--accent)" : "var(--text-muted)",
                          borderRadius: 2,
                          width: `${Math.min(Math.abs(diff) / 4 * 50, 50)}%`,
                          left: diff > 0 ? "50%" : `${50 - Math.min(Math.abs(diff) / 4 * 50, 50)}%`,
                        }} />
                      </div>
                      <span style={{
                        color: diff > 0.1 ? "var(--accent)" : diff < -0.1 ? "var(--text-muted)" : "var(--text-sub)",
                        fontSize: 12,
                        fontWeight: 600,
                        width: 44,
                        textAlign: "right",
                      }}>
                        {diff > 0.1 ? `+${diff}` : diff < -0.1 ? `${diff}` : "비슷함"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}
