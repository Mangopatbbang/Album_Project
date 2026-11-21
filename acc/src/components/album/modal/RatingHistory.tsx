"use client";

// AlbumModal — 내 평점 이력 타임라인 + 청음 횟수 (AlbumModal에서 분리, 동작 동일)
// 노출 조건(이력 2개 이상 / 로그인·평가 있음)은 부모가 판단한다.
import { scoreColor } from "@/lib/score";

export type RatingHistoryItem = { score: number; createdAt: string };

export function RatingHistoryTimeline({ history }: { history: RatingHistoryItem[] }) {
  return (
    <div style={{ marginTop: 12, padding: "10px 12px", backgroundColor: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>평점 이력</p>
      <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
        {history.map((h, i) => {
          const d = new Date(h.createdAt);
          const label = `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
          const isLast = i === history.length - 1;
          return (
            <span key={h.createdAt + i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(String(h.score)) }}>{h.score}</span>
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{label}</span>
              </span>
              {!isLast && <span style={{ color: "var(--text-muted)", fontSize: 11, margin: "0 6px", marginBottom: 10 }}>→</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function ListenCount({ count }: { count: number }) {
  return (
    <div className="px-5 sm:px-8" style={{ marginBottom: 0 }}>
      <div style={{ height: 1, backgroundColor: "var(--border)", margin: "28px 0" }} />
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 12, color: "var(--text-muted)",
        border: "1px solid var(--border)", borderRadius: 6,
        padding: "5px 12px",
      }}>
        청음
        <span style={{ fontSize: 11, opacity: 0.65 }}>{count}회</span>
      </span>
    </div>
  );
}
