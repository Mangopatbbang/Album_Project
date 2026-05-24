"use client";

import { useMemo, useState } from "react";
import { DiaryEntry } from "@/types/diary";
import DiaryEntryCard from "@/components/diary/DiaryEntryCard";
import DeleteConfirmModal from "@/components/diary/DeleteConfirmModal";

type Props = {
  entries: DiaryEntry[];
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => Promise<void>;
  isSample?: boolean;
};

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const padding = (firstDay + 6) % 7;
  const grid: (number | null)[] = [];
  for (let i = 0; i < padding; i++) grid.push(null);
  for (let i = 1; i <= daysInMonth; i++) grid.push(i);
  return grid;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export default function CalendarTab({ entries, onEdit, onDelete, isSample }: Props) {
  const kstNow = new Date(Date.now() + 9 * 3600000);
  const initYear = parseInt(kstNow.toISOString().slice(0, 4));
  const initMonth = parseInt(kstNow.toISOString().slice(5, 7));
  const todayStr = kstNow.toISOString().slice(0, 10);

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const entryByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.listened_at) ?? [];
      arr.push(e);
      map.set(e.listened_at, arr);
    }
    return map;
  }, [entries]);

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const selectedEntries = selectedDate ? (entryByDate.get(selectedDate) ?? []) : [];

  // 이 달 총 기록 수
  const monthPrefix = toDateStr(viewYear, viewMonth, 1).slice(0, 7);
  const monthCount = entries.filter((e) => e.listened_at.startsWith(monthPrefix)).length;

  return (
    <>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px calc(80px + env(safe-area-inset-bottom))" }}>

        {/* 월 네비게이션 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button
            onClick={prevMonth}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}
          >
            ‹
          </button>
          <div style={{ textAlign: "center" }}>
            <p style={{
              color: "var(--text)", fontSize: 17, fontWeight: 700,
              fontFamily: "var(--font-playfair, serif)", letterSpacing: "-0.02em",
            }}>
              {viewYear}년 {viewMonth}월
            </p>
            {monthCount > 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 2 }}>
                {monthCount}개의 기록
              </p>
            )}
          </div>
          <button
            onClick={nextMonth}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4, marginTop: 16 }}>
          {DAY_LABELS.map((d) => (
            <div key={d} style={{
              textAlign: "center", color: "var(--text-muted)",
              fontSize: 11, fontWeight: 600, padding: "4px 0",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {grid.map((day, i) => {
            if (day === null) return <div key={`p-${i}`} style={{ padding: "6px 0" }} />;
            const dateStr = toDateStr(viewYear, viewMonth, day);
            const hasEntry = entryByDate.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <div
                key={dateStr}
                onClick={() => hasEntry && setSelectedDate(isSelected ? null : dateStr)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "4px 0", cursor: hasEntry ? "pointer" : "default",
                }}
              >
                <div style={{
                  width: 34, height: 34,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "50%",
                  backgroundColor: isSelected ? "var(--accent)" : "transparent",
                  border: isToday && !isSelected
                    ? "1px solid rgba(var(--accent-rgb), 0.5)"
                    : "1px solid transparent",
                  transition: "background-color 0.12s",
                }}>
                  <span style={{
                    fontSize: 13,
                    color: isSelected ? "#1C1917" : hasEntry ? "var(--text)" : "var(--text-muted)",
                    fontWeight: hasEntry ? 600 : 400,
                  }}>
                    {day}
                  </span>
                </div>
                <div style={{
                  width: 4, height: 4, borderRadius: "50%", marginTop: 2,
                  backgroundColor: hasEntry
                    ? (isSelected ? "var(--bg)" : "var(--accent)")
                    : "transparent",
                }} />
              </div>
            );
          })}
        </div>

        {/* 선택된 날 엔트리 */}
        {selectedDate && selectedEntries.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{
              height: 1,
              background: "linear-gradient(90deg, var(--accent) 0%, var(--border) 30%, transparent 100%)",
              opacity: 0.4, marginBottom: 24,
            }} />
            <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", marginBottom: 24 }}>
              {selectedDate.slice(0, 4)}년 {parseInt(selectedDate.slice(5, 7))}월 {parseInt(selectedDate.slice(8, 10))}일
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedEntries.map((entry, idx) => (
                <div key={entry.id} style={{ animation: `feedItemIn 0.22s ease-out ${idx * 0.07}s both` }}>
                  <DiaryEntryCard
                    entry={entry}
                    onEdit={() => onEdit(entry)}
                    onDeleteRequest={() => setDeleteConfirm(entry.id)}
                    isSample={isSample}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 13, opacity: 0.5 }}>기록이 없어요</p>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <DeleteConfirmModal
          onConfirm={async () => {
            await onDelete(deleteConfirm);
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}
