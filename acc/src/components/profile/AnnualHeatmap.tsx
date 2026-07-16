"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AlbumWithRatings } from "@/types";

const AlbumModal = dynamic(() => import("@/components/album/AlbumModal"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.5)" }} />,
});

export type HeatmapRating = {
  albumId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  score: number;
};

export default function AnnualHeatmap({
  data,
  total,
  ratingsByDate = {},
}: {
  data: Record<string, number>;
  total: number;
  ratingsByDate?: Record<string, HeatmapRating[]>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: dateStr, count: data[dateStr] ?? 0 });
  }

  const startDow = new Date(cells[0].date).getDay();
  const padded: ({ date: string; count: number } | null)[] = [
    ...Array(startDow).fill(null),
    ...cells,
  ];

  const weeks: ({ date: string; count: number } | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

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

  const yearCount = cells.filter((c) => c.count > 0).reduce((s, c) => s + c.count, 0);

  const handleCellClick = (dateStr: string) => {
    if (!ratingsByDate[dateStr]?.length) return;
    setSelectedDate((d) => (d === dateStr ? null : dateStr));
  };

  const selectedAlbums = selectedDate ? (ratingsByDate[selectedDate] ?? []) : [];

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
              style={{ width: 11, flexShrink: 0, fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "visible" }}
            >
              {monthLabels[wi] ?? ""}
            </div>
          ))}
        </div>

        {/* 그리드 */}
        <div style={{ display: "flex", gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((cell, di) => {
                const hasAlbums = cell ? (ratingsByDate[cell.date]?.length ?? 0) > 0 : false;
                const isSelected = cell?.date === selectedDate;
                return (
                  <div
                    key={di}
                    title={cell ? `${cell.date}: ${cell.count}장` : undefined}
                    onClick={hasAlbums ? () => handleCellClick(cell!.date) : undefined}
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      flexShrink: 0,
                      cursor: hasAlbums ? "pointer" : "default",
                      outline: isSelected ? "1.5px solid var(--accent)" : "none",
                      outlineOffset: "1px",
                      ...(cell ? getCellStyle(cell.count) : { backgroundColor: "transparent" }),
                    }}
                  />
                );
              })}
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

      {/* 날짜 클릭 패널 */}
      {selectedDate && selectedAlbums.length > 0 && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
              {selectedDate} — {selectedAlbums.length}장
            </p>
            <button
              onClick={() => setSelectedDate(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "2px 4px", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {selectedAlbums.map((r) => (
              <div
                key={r.albumId}
                onClick={() => setSelectedAlbum({
                  id: r.albumId,
                  title: r.title,
                  artist: r.artist,
                  cover_url: r.coverUrl ?? undefined,
                  ratings: [],
                } as unknown as AlbumWithRatings)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer", borderRadius: 6 }}
                className="hover:opacity-75 transition-opacity active:opacity-60"
              >
                <div style={{ width: 34, height: 34, borderRadius: 5, overflow: "hidden", backgroundColor: "var(--bg-elevated)", flexShrink: 0, border: "1px solid var(--border)" }}>
                  {r.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.coverUrl} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>♪</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.artist}</p>
                </div>
                <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} source="profile_heatmap" />
      )}
    </div>
  );
}
