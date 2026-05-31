"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { scoreColor } from "@/lib/score";
import UserAvatar from "@/components/ui/UserAvatar";

type Analytics = {
  period: number;
  kpis: { total_ratings: number; week_ratings: number; week_deep_ratings: number; today_visits: number; total_members: number };
  member_activity: {
    id: string; display_name: string; avatar_url: string | null; role: string;
    total_ratings: number; recent_ratings: number; avg_score: number | null;
    last_rating_at: string | null; is_active: boolean;
  }[];
  top_pages: { path: string; count: number }[];
  top_features: { feature: string; count: number }[];
  top_searches: { query: string; count: number; avg_results: number }[];
  top_albums: { album_id: string; count: number; title: string; artist: string; cover_url: string | null }[];
  top_watchlist: { album_id: string; count: number; title: string; artist: string; cover_url: string | null }[];
  device: { mobile: number; desktop: number };
  user_funnel: { id: string; display_name: string; avatar_url: string | null; visits: number; total_ratings: number; converted: number; conversion_pct: number }[];
  source_funnel: { source: string; visits: number; converted: number; conversion_pct: number }[];
  top_unconverted: { album_id: string; title: string; artist: string; cover_url: string | null; visit_count: number; visitors: string }[];
  truncated_warning?: string;
};

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{
      backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: 0,
    }}>
      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function BarChart({ items, maxCount, colorFn }: {
  items: { label: string; count: number }[];
  maxCount: number;
  colorFn?: (label: string) => string;
}) {
  if (items.length === 0) return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>데이터 없음</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map(({ label, count }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 130, flexShrink: 0, fontSize: 11, color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </div>
          <div style={{ flex: 1, backgroundColor: "var(--bg-elevated)", borderRadius: 3, height: 6, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${Math.round((count / maxCount) * 100)}%`,
              backgroundColor: colorFn ? colorFn(label) : "var(--accent)",
              opacity: 0.8,
              transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", width: 28, textAlign: "right", flexShrink: 0 }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

function AlbumCoverRow({ items, badge }: {
  items: { album_id: string; count: number; title: string; artist: string; cover_url: string | null }[];
  badge: string;
}) {
  if (items.length === 0) return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>데이터 없음</p>;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((item) => (
        <div key={item.album_id} style={{ position: "relative", width: 64 }} title={`${item.title}\n${item.artist}`}>
          <div style={{
            width: 64, height: 64, borderRadius: 6, overflow: "hidden",
            backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
            flexShrink: 0,
          }}>
            {item.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.cover_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18, color: "var(--text-muted)" }}>♪</span>
                </div>
            }
          </div>
          <div style={{
            position: "absolute", bottom: 3, right: 3,
            backgroundColor: "rgba(0,0,0,0.72)", borderRadius: 4,
            padding: "1px 4px", fontSize: 9, fontWeight: 700, color: "#fff",
          }}>
            {badge}{item.count}
          </div>
          <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </p>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function formatPath(path: string): string {
  const map: Record<string, string> = {
    "/": "홈",
    "/best": "청음감",
    "/albums": "음반 목록",
    "/board": "청음록",
    "/reviews": "청음평",
    "/members": "멤버",
    "/themes": "테마",
  };
  if (map[path]) return map[path];
  if (path.startsWith("/profile/")) return `프로필: ${path.replace("/profile/", "")}`;
  if (path.startsWith("/playlist/")) return `청음집`;
  return path;
}

export default function AdminDataTab() {
  const [period, setPeriod] = useState<7 | 30>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/api/admin/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d: Analytics & { error?: string }) => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError("데이터 로드 중 오류가 발생했습니다"); setLoading(false); });
  }, [period]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오는 중...</p>
      </div>
    );
  }

  if (error) return <p style={{ color: "var(--error)", fontSize: 13 }}>{error}</p>;
  if (!data) return <p style={{ color: "var(--error)", fontSize: 13 }}>데이터 로드 실패</p>;

  const maxPageCount = Math.max(...data.top_pages.map((p) => p.count), 1);
  const maxFeatureCount = Math.max(...data.top_features.map((f) => f.count), 1);
  const totalDevice = data.device.mobile + data.device.desktop;
  const mobileRatio = totalDevice ? Math.round((data.device.mobile / totalDevice) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* 기간 필터 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 4 }}>기간</span>
        {([7, 30] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: `1px solid ${period === p ? "var(--accent)" : "var(--border)"}`,
              backgroundColor: period === p ? "var(--accent)" : "var(--bg-elevated)",
              color: period === p ? "var(--bg)" : "var(--text-sub)",
              cursor: "pointer",
            }}
          >
            {p}일
          </button>
        ))}
      </div>

      {/* 데이터 절삭 경고 */}
      {data.truncated_warning && (
        <div style={{
          backgroundColor: "rgba(240,160,40,0.08)", border: "1px solid rgba(240,160,40,0.3)",
          borderRadius: 8, padding: "10px 16px",
          fontSize: 12, color: "#df9e30",
        }}>
          ⚠️ {data.truncated_warning}
        </div>
      )}

      {/* KPI 카드 */}
      <div style={{ display: "flex", gap: 10 }}>
        <KpiCard label="총 평점" value={data.kpis.total_ratings.toLocaleString()} />
        <KpiCard label="이번 주 새 평점" value={data.kpis.week_ratings} />
        <KpiCard label="이번 주 깊이있는 평가" value={data.kpis.week_deep_ratings} sub="한줄 소감 포함" />
        <KpiCard label="오늘 방문" value={data.kpis.today_visits} />
        <KpiCard label="총 멤버" value={data.kpis.total_members} />
        <KpiCard
          label="기기 비율"
          value={`${mobileRatio}%`}
          sub={`모바일 · 데스크탑 ${100 - mobileRatio}%`}
        />
      </div>

      {/* 멤버 활동 */}
      <div>
        <SectionTitle>멤버 활동</SectionTitle>
        <div style={{
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          {/* 헤더 */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 80px 70px 60px 80px",
            padding: "8px 16px", borderBottom: "1px solid var(--border)",
            fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em",
          }}>
            <span>멤버</span>
            <span style={{ textAlign: "right" }}>마지막 평가</span>
            <span style={{ textAlign: "right" }}>총 평점</span>
            <span style={{ textAlign: "right" }}>평균</span>
            <span style={{ textAlign: "right" }}>7일 활동</span>
          </div>
          {data.member_activity.map((m) => (
            <div
              key={m.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr 80px 70px 60px 80px",
                padding: "10px 16px", borderBottom: "1px solid var(--border)",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative" }}>
                  <UserAvatar avatarUrl={m.avatar_url} size={26} />
                  <div style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: m.is_active ? "#4caf7d" : "var(--border-light)",
                    border: "1.5px solid var(--bg-card)",
                  }} />
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{m.display_name}</span>
                  {m.role === "admin" && (
                    <span style={{ fontSize: 9, color: "var(--accent)", fontWeight: 700, marginLeft: 5 }}>ADMIN</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
                {formatDate(m.last_rating_at)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "right" }}>
                {m.total_ratings}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 700, textAlign: "right",
                color: m.avg_score !== null ? scoreColor(m.avg_score) : "var(--text-muted)",
              }}>
                {m.avg_score !== null ? m.avg_score.toFixed(1) : "—"}
              </span>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                {m.recent_ratings > 0
                  ? <span style={{ fontSize: 12, fontWeight: 600, color: "#4caf7d" }}>+{m.recent_ratings}</span>
                  : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>없음</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 전환율 퍼널 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* 유저별 */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <SectionTitle>유저별 전환율 ({period}일)</SectionTitle>
            <p style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6, marginTop: -8 }}>기간 내 방문 앨범 중 평가로 이어진 비율</p>
          </div>
          {data.user_funnel.length === 0
            ? <p style={{ padding: 16, fontSize: 12, color: "var(--text-muted)" }}>데이터 없음</p>
            : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 56px", padding: "6px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>
                  <span>멤버</span>
                  <span style={{ textAlign: "right" }}>방문</span>
                  <span style={{ textAlign: "right" }}>평가</span>
                  <span style={{ textAlign: "right" }}>전환율</span>
                </div>
                {data.user_funnel.map((u) => (
                  <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 56px", padding: "8px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <UserAvatar avatarUrl={u.avatar_url} size={22} />
                      <span style={{ fontSize: 12, color: "var(--text)" }}>{u.display_name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>{u.visits}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>{u.converted}</span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                      <div style={{ width: 32, height: 4, backgroundColor: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${u.conversion_pct}%`, backgroundColor: u.conversion_pct >= 50 ? "#4caf7d" : u.conversion_pct >= 25 ? "var(--accent)" : "var(--text-muted)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: u.conversion_pct >= 50 ? "#4caf7d" : "var(--text-sub)", minWidth: 28, textAlign: "right" }}>{u.conversion_pct}%</span>
                    </div>
                  </div>
                ))}
              </>
            )
          }
        </div>

        {/* source별 */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionTitle>유입경로별 전환율 ({period}일)</SectionTitle>
          {data.source_funnel.length === 0
            ? <p style={{ fontSize: 12, color: "var(--text-muted)" }}>데이터 없음</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.source_funnel.map((s) => (
                  <div key={s.source} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 110, flexShrink: 0, fontSize: 11, color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.source}</div>
                    <div style={{ flex: 1, backgroundColor: "var(--bg-elevated)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: `${s.conversion_pct}%`, backgroundColor: "var(--accent)", opacity: 0.75, transition: "width 0.4s ease" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", width: 20, textAlign: "right", flexShrink: 0 }}>{s.converted}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)", width: 36, textAlign: "right", flexShrink: 0 }}>{s.conversion_pct}%</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* 미전환 앨범 */}
      {data.top_unconverted.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionTitle>많이 봤는데 아무도 평가 안 한 앨범 ({period}일)</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.top_unconverted.map((a) => (
              <div key={a.album_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 5, overflow: "hidden", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {a.cover_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text-muted)" }}>♪</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.artist}</p>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-sub)" }}>👁 {a.visit_count}명</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{a.visitors}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 페이지 인기도 + 기능 사용 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionTitle>페이지 인기도 ({period}일)</SectionTitle>
          <BarChart
            items={data.top_pages.map((p) => ({ label: formatPath(p.path), count: p.count }))}
            maxCount={maxPageCount}
          />
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionTitle>기능 사용 ({period}일)</SectionTitle>
          <BarChart
            items={data.top_features.map((f) => ({ label: f.feature, count: f.count }))}
            maxCount={maxFeatureCount}
            colorFn={() => "var(--color-foreign)"}
          />
        </div>
      </div>

      {/* 검색어 */}
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
        <SectionTitle>검색어 순위 ({period}일)</SectionTitle>
        {data.top_searches.length === 0
          ? <p style={{ fontSize: 12, color: "var(--text-muted)" }}>데이터 없음</p>
          : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.top_searches.map((s, i) => (
                <div key={s.query} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
                  borderRadius: 20, padding: "5px 12px",
                }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, minWidth: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{s.query}</span>
                  <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>{s.count}회</span>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* 인기 앨범 + 위시리스트 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionTitle>많이 본 앨범 ({period}일)</SectionTitle>
          <AlbumCoverRow items={data.top_albums} badge="👁 " />
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          <SectionTitle>위시리스트 인기</SectionTitle>
          <AlbumCoverRow items={data.top_watchlist} badge="♡ " />
        </div>
      </div>


    </div>
  );
}
