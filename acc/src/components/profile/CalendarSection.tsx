"use client";

import { useState } from "react";

type MonthItem = { key: string; label: string; count: number };
type DailyData = Record<string, number>; // "YYYY-MM-DD" → count

function MonthlyChart({ monthData, maxMonthCount }: { monthData: MonthItem[]; maxMonthCount: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
      {monthData.map((m) => (
        <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{m.count > 0 ? m.count : ""}</span>
          <div style={{
            width: "100%",
            height: `${Math.max((m.count / maxMonthCount) * 52, m.count > 0 ? 4 : 2)}px`,
            backgroundColor: m.count > 0 ? "var(--accent)" : "var(--bg-elevated)",
            borderRadius: "3px 3px 0 0",
            opacity: m.count === 0 ? 0.3 : 0.85,
            transition: "height 0.3s ease",
          }} />
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            <span className="sm:hidden">{m.label}</span>
            <span className="hidden sm:block">{m.label}월</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DailyHeatmap({ dailyData }: { dailyData: DailyData }) {
  // 최근 15주(105일) 히트맵
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 오늘 기준 가장 가까운 토요일부터 시작 (15주 × 7일)
  const WEEKS = 15;
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - (WEEKS * 7 - 1));

  const days: { date: string; count: number; dayOfWeek: number }[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: key, count: dailyData[key] ?? 0, dayOfWeek: d.getDay() });
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  // 7행 × WEEKS열 그리드 (월요일=0행 ~ 일요일=6행)
  const DOW_LABELS = ["월", "", "수", "", "금", "", "일"];
  const cells = Array.from({ length: 7 }, (_, row) =>
    days.filter((_, i) => i % 7 === row)
  );

  // 월 레이블: 각 열의 첫 번째 날 기준
  const weeks = Array.from({ length: WEEKS }, (_, wi) => days[wi * 7]);
  const monthLabels = weeks.map((d, wi) => {
    const dateObj = new Date(d.date);
    const isFirstOfMonth = dateObj.getDate() <= 7;
    if (wi === 0 || isFirstOfMonth) return `${dateObj.getMonth() + 1}월`;
    return "";
  });

  return (
    <div>
      {/* 월 레이블 */}
      <div style={{ display: "flex", gap: 2, marginBottom: 3, paddingLeft: 16 }}>
        {monthLabels.map((label, wi) => (
          <div key={wi} style={{ flex: 1, fontSize: 9, color: label ? "var(--text-muted)" : "transparent" }}>
            {label || "."}
          </div>
        ))}
      </div>
      {/* 그리드 */}
      <div style={{ display: "flex", gap: 2, alignItems: "stretch" }}>
        {/* 요일 레이블 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 14, flexShrink: 0 }}>
          {DOW_LABELS.map((label, i) => (
            <div key={i} style={{ flex: 1, fontSize: 9, color: "var(--text-muted)", lineHeight: 1, display: "flex", alignItems: "center" }}>
              {label}
            </div>
          ))}
        </div>
        {/* 주별 컬럼 */}
        {Array.from({ length: WEEKS }, (_, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
            {Array.from({ length: 7 }, (_, row) => {
              const d = days[wi * 7 + row];
              if (!d) return <div key={row} style={{ flex: 1 }} />;
              const intensity = d.count === 0 ? 0 : Math.max(0.2, d.count / maxCount);
              const isToday = d.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
              return (
                <div
                  key={row}
                  title={d.count > 0 ? `${d.date}: ${d.count}장` : d.date}
                  style={{
                    flex: 1,
                    minHeight: 10,
                    borderRadius: 2,
                    backgroundColor: d.count > 0
                      ? `rgba(232, 213, 163, ${0.15 + intensity * 0.85})`
                      : "var(--bg-elevated)",
                    border: isToday ? "1px solid var(--accent)" : "none",
                    opacity: d.count === 0 ? 0.4 : 1,
                    transition: "background-color 0.2s",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarSection({
  monthData,
  maxMonthCount,
  dailyData,
}: {
  monthData: MonthItem[];
  maxMonthCount: number;
  dailyData: DailyData;
}) {
  const [view, setView] = useState<"monthly" | "daily">("monthly");

  return (
    <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4 sm:p-5">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
          청음 캘린더
        </p>
        <div style={{ display: "flex", gap: 4 }}>
          {(["monthly", "daily"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "var(--bg)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {v === "monthly" ? "월별" : "일별"}
            </button>
          ))}
        </div>
      </div>
      {view === "monthly"
        ? <MonthlyChart monthData={monthData} maxMonthCount={maxMonthCount} />
        : <DailyHeatmap dailyData={dailyData} />
      }
    </div>
  );
}
