"use client";

import React from "react";

export default function AnnualHeatmap({
  data,
  total,
}: {
  data: Record<string, number>;
  total: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 지난 365일 셀 생성
  const cells: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: dateStr, count: data[dateStr] ?? 0 });
  }

  // 일요일 기준 패딩
  const startDow = new Date(cells[0].date).getDay();
  const padded: ({ date: string; count: number } | null)[] = [
    ...Array(startDow).fill(null),
    ...cells,
  ];

  // 주 단위로 분할
  const weeks: ({ date: string; count: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  // 월 레이블
  const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const monthLabels: Record<number, string> = {};
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstCell = week.find((c) => c !== null);
    if (firstCell) {
      const m = new Date(firstCell.date).getMonth();
      if (m !== lastMonth) {
        monthLabels[wi] = monthNames[m];
        lastMonth = m;
      }
    }
  });

  const getCellStyle = (count: number): React.CSSProperties => {
    if (count === 0) return { backgroundColor: "var(--bg-elevated)" };
    const opacity = count === 1 ? 0.35 : count === 2 ? 0.65 : 1;
    return { backgroundColor: "var(--accent)", opacity };
  };

  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearCount = cells.filter((c) => c.count > 0).reduce((s, c) => s + c.count, 0);

  return (
    <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
          청음 히트맵
        </p>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          최근 1년 {yearCount}장
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        {/* 월 레이블 */}
        <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
          {weeks.map((_, wi) => (
            <div
              key={wi}
              style={{
                width: 11,
                flexShrink: 0,
                fontSize: 9,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "visible",
              }}
            >
              {monthLabels[wi] ?? ""}
            </div>
          ))}
        </div>

        {/* 그리드 */}
        <div style={{ display: "flex", gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={cell ? `${cell.date}: ${cell.count}장` : undefined}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 2,
                    flexShrink: 0,
                    ...(cell ? getCellStyle(cell.count) : { backgroundColor: "transparent" }),
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 9 }}>적음</span>
          {[0, 1, 2, 3].map((level) => (
            <div
              key={level}
              style={{
                width: 11,
                height: 11,
                borderRadius: 2,
                ...(level === 0
                  ? { backgroundColor: "var(--bg-elevated)" }
                  : { backgroundColor: "var(--accent)", opacity: level === 1 ? 0.35 : level === 2 ? 0.65 : 1 }),
              }}
            />
          ))}
          <span style={{ color: "var(--text-muted)", fontSize: 9 }}>많음</span>
        </div>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 10, opacity: 0.6 }}>
        전체 누적 {total}장
      </p>
    </div>
  );
}
