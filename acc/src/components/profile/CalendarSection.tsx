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

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function MonthCalendar({ year, month, dailyData }: { year: number; month: number; dailyData: DailyData }) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxCount = Math.max(...Object.values(dailyData).filter((_, i) => {
    const keys = Object.keys(dailyData);
    return keys[i].startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
  }), 1);

  // 전체 dailyData에서 이 달의 최대값
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthMax = Math.max(
    ...Object.entries(dailyData)
      .filter(([k]) => k.startsWith(monthPrefix))
      .map(([, v]) => v),
    1
  );

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 7의 배수로 맞춤
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DOW.map((d) => (
          <div key={d} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 9, fontWeight: 600, paddingBottom: 2 }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = dailyData[key] ?? 0;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const intensity = count > 0 ? Math.max(0.25, count / monthMax) : 0;
          const isSun = (firstDay + day - 1) % 7 === 0;
          const isSat = (firstDay + day - 1) % 7 === 6;
          return (
            <div
              key={key}
              title={count > 0 ? `${month + 1}/${day} — ${count}장` : undefined}
              style={{
                aspectRatio: "1/1",
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: count > 0
                  ? `rgba(232, 213, 163, ${intensity})`
                  : "var(--bg-elevated)",
                border: isToday ? "1px solid var(--accent)" : "1px solid transparent",
                opacity: count === 0 ? 0.5 : 1,
                position: "relative",
                cursor: count > 0 ? "default" : undefined,
              }}
            >
              <span style={{
                fontSize: 10,
                color: count > 0 ? "var(--text)" : (isSun ? "#e05050" : isSat ? "#7799cc" : "var(--text-muted)"),
                fontWeight: count > 0 ? 600 : 400,
                lineHeight: 1,
              }}>
                {day}
              </span>
              {count > 0 && (
                <span style={{ fontSize: 8, color: "var(--accent)", fontWeight: 700, lineHeight: 1, marginTop: 1 }}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
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

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  const goPrev = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const goNext = () => {
    const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();
    if (isCurrentMonth) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

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

      {view === "monthly" ? (
        <MonthlyChart monthData={monthData} maxMonthCount={maxMonthCount} />
      ) : (
        <div>
          {/* 월 네비게이션 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button
              onClick={goPrev}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "2px 6px" }}
            >
              ‹
            </button>
            <span style={{ color: "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
              {calYear}년 {calMonth + 1}월
            </span>
            <button
              onClick={goNext}
              style={{
                background: "none", border: "none", cursor: isCurrentMonth ? "default" : "pointer",
                color: isCurrentMonth ? "var(--border)" : "var(--text-muted)",
                fontSize: 14, padding: "2px 6px",
              }}
            >
              ›
            </button>
          </div>
          <MonthCalendar year={calYear} month={calMonth} dailyData={dailyData} />
        </div>
      )}
    </div>
  );
}
