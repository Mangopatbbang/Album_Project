"use client";

import { useMemo, useState } from "react";
import { DiaryEntry } from "@/types/diary";

type Period = "all" | "month";

type Props = {
  entries: DiaryEntry[];
};

function calcStreak(entries: DiaryEntry[]): number {
  const dates = [...new Set(entries.map((e) => e.listened_at))].sort().reverse();
  if (!dates.length) return 0;
  const kst = new Date(Date.now() + 9 * 3600000);
  const today = kst.toISOString().slice(0, 10);
  const yesterday = new Date(kst.getTime() - 86400000).toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function getLast6Months(entries: DiaryEntry[]) {
  const kst = new Date(Date.now() + 9 * 3600000);
  const kstYear = parseInt(kst.toISOString().slice(0, 4));
  const kstMonth = parseInt(kst.toISOString().slice(5, 7));
  return Array.from({ length: 6 }, (_, i) => {
    let month = kstMonth - (5 - i);
    let year = kstYear;
    while (month <= 0) { month += 12; year--; }
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return {
      label: `${month}월`,
      count: entries.filter((e) => e.listened_at.startsWith(prefix)).length,
      isCurrent: i === 5,
    };
  });
}

function getTopAlbums(entries: DiaryEntry[], limit = 5) {
  const map = new Map<string, { title: string; artist: string; cover_url: string | null; count: number }>();
  for (const e of entries) {
    if (!e.albums) continue;
    const ex = map.get(e.albums.id);
    if (ex) ex.count++;
    else map.set(e.albums.id, { title: e.albums.title, artist: e.albums.artist, cover_url: e.albums.cover_url, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function getTopTags(entries: DiaryEntry[], limit = 10) {
  const freq = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.context ?? []) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag, count]) => ({ tag, count }));
}

export default function StatsTab({ entries }: Props) {
  const [period, setPeriod] = useState<Period>("all");

  const monthPrefix = useMemo(
    () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7),
    []
  );

  const periodEntries = useMemo(
    () => period === "all" ? entries : entries.filter((e) => e.listened_at.startsWith(monthPrefix)),
    [entries, period, monthPrefix]
  );

  const streak = useMemo(() => calcStreak(entries), [entries]);
  const monthData = useMemo(() => getLast6Months(entries), [entries]);
  const topAlbums = useMemo(() => getTopAlbums(periodEntries), [periodEntries]);
  const topTags = useMemo(() => getTopTags(periodEntries), [periodEntries]);
  const maxBar = Math.max(...monthData.map((m) => m.count), 1);

  const albumCount = useMemo(
    () => new Set(periodEntries.map((e) => e.albums?.id).filter(Boolean)).size,
    [periodEntries]
  );
  const relistenCount = useMemo(
    () => periodEntries.filter((e) => e.relistened).length,
    [periodEntries]
  );

  if (entries.length === 0) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13, opacity: 0.5 }}>
          기록이 쌓이면 통계가 만들어져요
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px calc(80px + env(safe-area-inset-bottom))" }}>

      {/* streak */}
      {streak > 0 && (
        <div style={{
          marginBottom: 24,
          background: "rgba(var(--accent-rgb), 0.05)",
          border: "1px solid rgba(var(--accent-rgb), 0.18)",
          borderRadius: 12, padding: "20px 24px",
          display: "flex", alignItems: "center", gap: 18,
        }}>
          <p style={{
            fontSize: 40, color: "var(--accent)", lineHeight: 1,
            fontFamily: "var(--font-playfair, serif)", fontWeight: 700,
          }}>
            {streak}
          </p>
          <div>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700 }}>일 연속 기록 중</p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 3 }}>Keep it going ✦</p>
          </div>
        </div>
      )}

      {/* 기간 토글 */}
      <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
        {(["all", "month"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "4px 12px", borderRadius: 20,
              border: `1px solid ${period === p ? "var(--accent)" : "var(--border)"}`,
              backgroundColor: period === p ? "rgba(var(--accent-rgb), 0.12)" : "transparent",
              color: period === p ? "var(--accent)" : "var(--text-muted)",
              fontSize: 11, fontWeight: period === p ? 600 : 400, cursor: "pointer",
            }}
          >
            {p === "all" ? "전체" : "이달"}
          </button>
        ))}
      </div>

      {/* 숫자 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { label: "총 기록", value: periodEntries.length },
          { label: "앨범 수", value: albumCount },
          { label: "재청취", value: relistenCount },
        ].map((item) => (
          <div key={item.label} style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10, padding: "16px 0", textAlign: "center",
          }}>
            <p style={{
              color: "var(--text)", fontSize: 26, fontWeight: 800,
              fontFamily: "var(--font-playfair, serif)", lineHeight: 1,
            }}>
              {item.value}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 5, letterSpacing: "0.04em" }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* 최근 6개월 바 차트 */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 14 }}>
          월별 기록
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 88 }}>
          {monthData.map((m, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: 5 }}>
              <div style={{
                width: "100%", borderRadius: "3px 3px 0 0",
                height: m.count > 0 ? `${Math.max((m.count / maxBar) * 100, 10)}%` : "3px",
                backgroundColor: m.count > 0 ? "var(--accent)" : "var(--border)",
                opacity: m.isCurrent ? 1 : 0.45,
              }} />
              <span style={{ fontSize: 9, color: m.isCurrent ? "var(--text-muted)" : "var(--text-sub)", letterSpacing: "0.02em" }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 많이 들은 앨범 */}
      {topAlbums.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 14 }}>
            많이 들은 앨범
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topAlbums.map((a, idx) => (
              <div key={a.title + idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--text-sub)", fontSize: 12, fontWeight: 700, width: 18, textAlign: "center", flexShrink: 0 }}>
                  {idx + 1}
                </span>
                <div style={{ width: 38, height: 38, borderRadius: 5, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {a.cover_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)" }}>♪</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-playfair, serif)" }}>
                    {a.title}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.artist}
                  </p>
                </div>
                <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {a.count}회
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 자주 쓴 태그 */}
      {topTags.length > 0 && (
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 14 }}>
            자주 쓴 태그
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {topTags.map(({ tag, count }) => (
              <span key={tag} style={{
                padding: "4px 10px", borderRadius: 20,
                backgroundColor: "rgba(var(--accent-rgb), 0.08)",
                border: "1px solid rgba(var(--accent-rgb), 0.2)",
                color: "var(--accent)", fontSize: 11, fontWeight: 500,
              }}>
                {tag}
                <span style={{ color: "var(--text-muted)", marginLeft: 5, fontSize: 10 }}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
