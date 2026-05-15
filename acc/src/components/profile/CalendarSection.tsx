"use client";

import { useState } from "react";
import { scoreColor } from "@/lib/score";

type MonthItem = { key: string; label: string; count: number };
type DayAlbum = { title: string; artist: string; artist_display?: string; cover_url: string | null; score: number; is_encounter?: boolean };
type DailyAlbums = Record<string, DayAlbum[]>; // "YYYY-MM-DD" → albums

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

function MonthCalendar({
  year,
  month,
  dailyAlbums,
  onDayClick,
}: {
  year: number;
  month: number;
  dailyAlbums: DailyAlbums;
  onDayClick: (key: string) => void;
}) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthMax = Math.max(
    ...Object.entries(dailyAlbums)
      .filter(([k]) => k.startsWith(monthPrefix))
      .map(([, v]) => v.length),
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
            color: i === 0 ? "var(--color-sunday)" : i === 6 ? "var(--color-saturday)" : "var(--text-muted)",
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
          const albums = dailyAlbums[key] ?? [];
          const count = albums.length;
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isFuture = new Date(year, month, day) > today;
          const intensity = count > 0 ? Math.max(0.3, count / monthMax) : 0;
          const col = (firstDay + day - 1) % 7;
          const dayColor = col === 0 ? "var(--color-sunday)" : col === 6 ? "var(--color-saturday)" : "var(--text-sub)";
          const hasEncounter = albums.some((a) => a.is_encounter);

          return (
            <div
              key={key}
              onClick={() => count > 0 && !isFuture && onDayClick(key)}
              title={count > 0 ? `${month + 1}월 ${day}일 — ${count}장 청음${hasEncounter ? " · 인연의 날" : ""}` : `${month + 1}월 ${day}일`}
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
                  : hasEncounter
                    ? "1.5px solid rgba(232,213,163,0.7)"
                    : count > 0 ? "1px solid rgba(232,213,163,0.25)" : "1px solid transparent",
                opacity: isFuture ? 0.25 : 1,
                cursor: count > 0 && !isFuture ? "pointer" : "default",
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
                  fontSize: 10,
                  color: "var(--accent)",
                  fontWeight: 700,
                  lineHeight: 1,
                }}>
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

// ── 날짜별 앨범 패널 ─────────────────────────────────────
function DayAlbumPanel({ dateKey, albums, onClose }: { dateKey: string; albums: DayAlbum[]; onClose: () => void }) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
          {m}월 {d}일 청음 {albums.length}장
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>✕</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {albums.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 4, overflow: "hidden",
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
            }}>
              {a.cover_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>♪</span>
                  </div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
                <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{a.title}</p>
                {a.is_encounter && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", backgroundColor: "rgba(232,213,163,0.12)", border: "1px solid rgba(232,213,163,0.35)", borderRadius: 3, padding: "1px 5px", flexShrink: 0 }}>인연</span>
                )}
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.artist_display ?? a.artist}</p>
            </div>
            <span style={{ color: scoreColor(a.score), fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{a.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 팝업 모달 ────────────────────────────────────────────
function CalendarPopup({ dailyAlbums, onClose }: { dailyAlbums: DailyAlbums; onClose: () => void }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  const goPrev = () => {
    setSelectedDay(null);
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const goNext = () => {
    if (isCurrentMonth) return;
    setSelectedDay(null);
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // 이 달 총 청음 수
  const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const monthTotal = Object.entries(dailyAlbums)
    .filter(([k]) => k.startsWith(monthPrefix))
    .reduce((s, [, v]) => s + v.length, 0);

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
          maxHeight: "90dvh",
          overflowY: "auto",
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
        <MonthCalendar
          year={calYear}
          month={calMonth}
          dailyAlbums={dailyAlbums}
          onDayClick={(key) => setSelectedDay(prev => prev === key ? null : key)}
        />
        {/* 선택된 날의 앨범 */}
        {selectedDay && dailyAlbums[selectedDay] && (
          <DayAlbumPanel
            dateKey={selectedDay}
            albums={dailyAlbums[selectedDay]}
            onClose={() => setSelectedDay(null)}
          />
        )}
        {/* 범례 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "rgba(232,213,163,0.5)", border: "1px solid rgba(232,213,163,0.25)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>청음한 날</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "rgba(232,213,163,0.5)", border: "1.5px solid rgba(232,213,163,0.7)" }} />
            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>인연의 날</span>
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
  dailyData: DailyAlbums;
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
        <CalendarPopup dailyAlbums={dailyData} onClose={() => setPopupOpen(false)} />
      )}
    </>
  );
}
