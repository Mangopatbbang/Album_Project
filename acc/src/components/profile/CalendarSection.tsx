"use client";

import { useState } from "react";

type MonthItem = { key: string; label: string; count: number };
type DailyData = Record<string, number>; // "YYYY-MM-DD" → count

// ── 월별 바차트 ──────────────────────────────────────────
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

// ── 일별 달력 그리드 ─────────────────────────────────────
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function MonthCalendar({ year, month, dailyData }: { year: number; month: number; dailyData: DailyData }) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* 요일 헤더 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{
            textAlign: "center",
            color: i === 0 ? "#e05050" : i === 6 ? "#7799cc" : "var(--text-muted)",
            fontSize: 11, fontWeight: 600,
          }}>
            {d}
          </div>
        ))}
      </div>
      {/* 날짜 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} style={{ aspectRatio: "1/1" }} />;
          const key = `${monthPrefix}-${String(day).padStart(2, "0")}`;
          const count = dailyData[key] ?? 0;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isFuture = new Date(year, month, day) > today;
          const intensity = count > 0 ? Math.max(0.3, count / monthMax) : 0;
          const col = (firstDay + day - 1) % 7;
          const dayColor = col === 0 ? "#e05050" : col === 6 ? "#7799cc" : "var(--text-sub)";

          return (
            <div
              key={key}
              title={count > 0 ? `${month + 1}월 ${day}일 — ${count}장 청음` : `${month + 1}월 ${day}일`}
              style={{
                aspectRatio: "1/1",
                borderRadius: 5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                backgroundColor: count > 0
                  ? `rgba(232,213,163,${0.1 + intensity * 0.55})`
                  : "var(--bg-elevated)",
                border: isToday
                  ? "1.5px solid var(--accent)"
                  : count > 0 ? "1px solid rgba(232,213,163,0.25)" : "1px solid transparent",
                opacity: isFuture ? 0.25 : 1,
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: count > 0 ? 600 : 400,
                color: count > 0 ? "var(--text)" : dayColor,
                lineHeight: 1,
              }}>
                {day}
              </span>
              {count > 0 && (
                <span style={{
                  fontSize: 8,
                  color: "var(--accent)",
                  fontWeight: 700,
                  lineHeight: 1,
                }}>
                  {count}장
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 팝업 모달 ────────────────────────────────────────────
function CalendarPopup({ dailyData, onClose }: { dailyData: DailyData; onClose: () => void }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  const goPrev = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // 이 달 총 청음 수
  const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const monthTotal = Object.entries(dailyData)
    .filter(([k]) => k.startsWith(monthPrefix))
    .reduce((s, [, v]) => s + v, 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          width: "min(380px, 100%)",
          padding: "24px 24px 28px",
          animation: "modalIn 0.18s ease-out",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={goPrev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>
              ‹
            </button>
            <div>
              <span style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>
                {calYear}년 {calMonth + 1}월
              </span>
              {monthTotal > 0 && (
                <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 8 }}>
                  총 {monthTotal}장
                </span>
              )}
            </div>
            <button
              onClick={goNext}
              style={{
                background: "none", border: "none",
                cursor: isCurrentMonth ? "default" : "pointer",
                color: isCurrentMonth ? "var(--border)" : "var(--text-muted)",
                fontSize: 18, lineHeight: 1, padding: "0 4px",
              }}
            >
              ›
            </button>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1 }}>
            ✕
          </button>
        </div>
        <MonthCalendar year={calYear} month={calMonth} dailyData={dailyData} />
        {/* 범례 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "rgba(232,213,163,0.5)", border: "1px solid rgba(232,213,163,0.25)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>청음한 날</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, border: "1.5px solid var(--accent)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>오늘</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(6px) } to { opacity:1; transform:none } }`}</style>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────
export default function CalendarSection({
  monthData,
  maxMonthCount,
  dailyData,
}: {
  monthData: MonthItem[];
  maxMonthCount: number;
  dailyData: DailyData;
}) {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4 sm:p-5">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
            청음 캘린더
          </p>
          <button
            onClick={() => setPopupOpen(true)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              border: "1px solid var(--border)",
              backgroundColor: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            일별 보기
          </button>
        </div>
        <MonthlyChart monthData={monthData} maxMonthCount={maxMonthCount} />
      </div>

      {popupOpen && (
        <CalendarPopup dailyData={dailyData} onClose={() => setPopupOpen(false)} />
      )}
    </>
  );
}
