"use client";

import { useMemo, useState } from "react";
import { DiaryEntry } from "@/types/diary";
import DiaryEntryCard from "@/components/diary/DiaryEntryCard";
import DeleteConfirmModal from "@/components/diary/DeleteConfirmModal";

type Filter = "all" | "month";

type Props = {
  entries: DiaryEntry[];
  loading: boolean;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onNewEntry: () => void;
  isSample?: boolean;
};

function parseDateParts(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    date: d.getDate(),
    day: days[d.getDay()],
  };
}

export default function RecordsTab({ entries, loading, onEdit, onDelete, onNewEntry, isSample }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const onThisDayEntries = useMemo(() => {
    const now = new Date(Date.now() + 9 * 3600000);
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const y = now.getUTCFullYear();
    return entries.filter((e) => {
      const ed = new Date(e.listened_at + "T00:00:00");
      return ed.getMonth() === m && ed.getDate() === d && ed.getFullYear() < y;
    });
  }, [entries]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    const prefix = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
    return entries.filter((e) => e.listened_at.startsWith(prefix));
  }, [entries, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of filtered) {
      const arr = map.get(e.listened_at) ?? [];
      arr.push(e);
      map.set(e.listened_at, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 40 }}>
        {[1, 2].map((i) => (
          <div key={i}>
            <div className="skeleton-shimmer" style={{ height: 18, width: 120, borderRadius: 4, marginBottom: 20 }} />
            <div className="skeleton-shimmer" style={{ height: 80, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 36, marginBottom: 20, opacity: 0.3, color: "var(--accent)" }}>♪</p>
        <p style={{
          color: "var(--text)", fontSize: 17, fontWeight: 700,
          letterSpacing: "-0.03em", marginBottom: 10,
          fontFamily: "var(--font-playfair, serif)",
        }}>
          첫 청음일기를 남겨볼까요
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.8, marginBottom: 28 }}>
          오늘 들은 앨범, 그 순간의 감정.<br />
          기록이 쌓이면 나만의 청음 역사가 됩니다.
        </p>
        <button
          onClick={onNewEntry}
          style={{
            backgroundColor: "transparent",
            border: "1px solid var(--accent)",
            borderRadius: 8, padding: "10px 24px",
            color: "var(--accent)", fontSize: 13,
            fontWeight: 600, cursor: "pointer",
          }}
        >
          첫 기록 남기기 →
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px calc(144px + env(safe-area-inset-bottom))" }}>

        {/* 오늘 같은 날 */}
        {onThisDayEntries.length > 0 && filter === "all" && !isSample && (
          <div style={{
            marginBottom: 32,
            background: "linear-gradient(150deg, #f7efdc 0%, #f0e8cc 100%)",
            border: "1px solid rgba(138,45,36,0.2)",
            borderRadius: 4,
            padding: "14px 16px",
            boxShadow: "2px 3px 8px rgba(43,34,24,0.08)",
          }}>
            <p style={{
              color: "var(--accent)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              marginBottom: 12,
            }}>
              ♪  오늘 같은 날
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {onThisDayEntries.map((e) => {
                const { year } = parseDateParts(e.listened_at);
                const yearsAgo = new Date().getFullYear() - year;
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 4,
                      overflow: "hidden", flexShrink: 0,
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-elevated)",
                    }}>
                      {e.albums?.cover_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={e.albums.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>♪</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "var(--text)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.albums?.title ?? "—"}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 10 }}>{e.albums?.artist}</p>
                    </div>
                    <span style={{ color: "var(--accent)", fontSize: 10, fontWeight: 600, flexShrink: 0, opacity: 0.8 }}>
                      {yearsAgo}년 전
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 필터 */}
        <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
          {(["all", "month"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px", borderRadius: 20,
                border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: filter === f ? "rgba(var(--accent-rgb), 0.12)" : "transparent",
                color: filter === f ? "var(--accent)" : "var(--text-muted)",
                fontSize: 11, fontWeight: filter === f ? 600 : 400,
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {f === "all" ? "전체" : "이달"}
            </button>
          ))}
        </div>

        {/* 필터 결과 없음 */}
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "60px 0", opacity: 0.6 }}>
            이달의 기록이 없어요
          </p>
        )}

        {/* 날짜별 엔트리 */}
        {grouped.map(([date, dayEntries], groupIdx) => {
          const { year, month, date: d, day } = parseDateParts(date);
          const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
          const yesterday = new Date(Date.now() + 9 * 3600000 - 86400000).toISOString().slice(0, 10);
          const relLabel = date === today ? "오늘" : date === yesterday ? "어제" : null;
          return (
            <div
              key={date}
              style={{
                marginBottom: 52,
                animation: `feedItemIn 0.25s ease-out ${groupIdx * 0.07}s both`,
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", marginBottom: 2 }}>
                  {year}
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <p style={{
                    color: "var(--text)", fontSize: 22, fontWeight: 800,
                    letterSpacing: "-0.04em", lineHeight: 1,
                    fontFamily: "var(--font-playfair, serif)",
                  }}>
                    {month}월 {d}일
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 400 }}>
                    {day}요일
                  </p>
                  {relLabel && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: "var(--accent)", opacity: 0.85,
                      backgroundColor: "rgba(196,170,124,0.1)",
                      border: "1px solid rgba(196,170,124,0.25)",
                      borderRadius: 4, padding: "2px 7px",
                      letterSpacing: "0.04em",
                    }}>
                      {relLabel}
                    </span>
                  )}
                </div>
                <div style={{
                  marginTop: 10, height: 1,
                  background: "linear-gradient(90deg, var(--accent) 0%, var(--border) 30%, transparent 100%)",
                  opacity: 0.5,
                }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {dayEntries.map((entry, idx) => (
                  <div key={entry.id} style={{ animation: `feedItemIn 0.22s ease-out ${idx * 0.06}s both` }}>
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
          );
        })}
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
