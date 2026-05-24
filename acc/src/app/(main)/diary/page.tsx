"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import DiaryEntryModal from "@/components/diary/DiaryEntryModal";

type DiaryEntry = {
  id: string;
  listened_at: string;
  note: string | null;
  context: string[] | null;
  image_url: string | null;
  relistened: boolean;
  albums: {
    id: string;
    title: string;
    artist: string;
    cover_url: string | null;
  } | null;
};

type Filter = "all" | "month";

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

function getRecentTags(entries: DiaryEntry[]): string[] {
  const freq = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.context ?? []) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);
}

export default function DiaryPage() {
  const { authUser } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/listening-logs?userId=${authUser.id}`);
      const data = await res.json();
      setEntries(data.logs ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser) { router.replace("/"); return; }
    fetchEntries();
  }, [authUser, router, fetchEntries]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const prefix = `${nowKst.getFullYear()}-${String(nowKst.getMonth() + 1).padStart(2, "0")}`;
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

  const recentTags = useMemo(() => getRecentTags(entries), [entries]);

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/listening-logs?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleteConfirm(null);
  };

  if (!authUser) return null;

  return (
    <>
      {/* 배경 — 미세한 온기 */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 15% 0%, rgba(180,140,60,0.05) 0%, transparent 60%)",
      }} />

      <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", position: "relative", zIndex: 1 }}>
        <main style={{ maxWidth: 600, margin: "0 auto", padding: "36px 24px calc(80px + env(safe-area-inset-bottom))" }}>

          {/* 헤더 */}
          <div style={{ marginBottom: 36 }}>
            <p style={{
              color: "var(--text-muted)", fontSize: 10,
              letterSpacing: "0.16em", textTransform: "uppercase",
              marginBottom: 6, fontWeight: 500,
            }}>
              Private
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h1 style={{
                  color: "var(--text)",
                  fontWeight: 800,
                  fontSize: 28,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                }}>
                  청음일기
                </h1>
                {entries.length > 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                    {entries.length}개의 기록
                  </p>
                )}
              </div>
              <button
                onClick={() => { setEditEntry(null); setShowModal(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  backgroundColor: "var(--accent)",
                  border: "none", borderRadius: 8,
                  padding: "9px 16px",
                  color: "var(--bg)", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "-0.01em", flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>✎</span> 기록하기
              </button>
            </div>
          </div>

          {/* 필터 */}
          <div style={{ display: "flex", gap: 5, marginBottom: 36 }}>
            {(["all", "month"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
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

          {/* 로딩 */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {[1, 2].map((i) => (
                <div key={i}>
                  <div className="skeleton-shimmer" style={{ height: 18, width: 120, borderRadius: 4, marginBottom: 20 }} />
                  <div className="skeleton-shimmer" style={{ height: 80, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          )}

          {/* 빈 상태 */}
          {!loading && entries.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p style={{
                color: "var(--text-muted)", fontSize: 32,
                marginBottom: 20, letterSpacing: "0.05em", opacity: 0.4,
              }}>
                ✎
              </p>
              <p style={{
                color: "var(--text)", fontSize: 16,
                fontWeight: 700, letterSpacing: "-0.03em",
                marginBottom: 10,
              }}>
                첫 청음일기를 남겨볼까요
              </p>
              <p style={{
                color: "var(--text-muted)", fontSize: 13,
                lineHeight: 1.8, marginBottom: 28,
              }}>
                오늘 들은 앨범, 그 순간의 감정.<br />
                기록이 쌓이면 나만의 청음 역사가 됩니다.
              </p>
              <button
                onClick={() => setShowModal(true)}
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
          )}

          {/* 필터 결과 없음 */}
          {!loading && entries.length > 0 && filtered.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "60px 0", opacity: 0.6 }}>
              이달의 기록이 없어요
            </p>
          )}

          {/* 날짜별 엔트리 */}
          {!loading && grouped.map(([date, dayEntries]) => {
            const { year, month, date: d, day } = parseDateParts(date);
            return (
              <div key={date} style={{ marginBottom: 52 }}>

                {/* 날짜 헤더 — 일기장 페이지 느낌 */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{
                    color: "var(--text-muted)", fontSize: 11,
                    letterSpacing: "0.04em", marginBottom: 2,
                  }}>
                    {year}
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <p style={{
                      color: "var(--text)",
                      fontSize: 22,
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}>
                      {month}월 {d}일
                    </p>
                    <p style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      fontWeight: 400,
                    }}>
                      {day}요일
                    </p>
                  </div>
                  <div style={{
                    marginTop: 10, height: 1,
                    background: "linear-gradient(90deg, var(--accent) 0%, var(--border) 30%, transparent 100%)",
                    opacity: 0.6,
                  }} />
                </div>

                {/* 엔트리들 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {dayEntries.map((entry) => (
                    <DiaryEntry
                      key={entry.id}
                      entry={entry}
                      noteExpanded={expandedNotes.has(entry.id)}
                      onToggleNote={() => setExpandedNotes((prev) => {
                        const next = new Set(prev);
                        if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id);
                        return next;
                      })}
                      onEdit={() => { setEditEntry(entry); setShowModal(true); }}
                      onDeleteRequest={() => setDeleteConfirm(entry.id)}
                      onImageClick={() => setExpandedImage(entry.image_url)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

        </main>
      </div>

      {/* 일기 작성/수정 모달 */}
      {showModal && (
        <DiaryEntryModal
          onClose={() => { setShowModal(false); setEditEntry(null); }}
          onSaved={() => { setShowModal(false); setEditEntry(null); fetchEntries(); }}
          recentTags={recentTags}
          editEntry={editEntry ? {
            id: editEntry.id,
            note: editEntry.note,
            context: editEntry.context,
            image_url: editEntry.image_url,
            listened_at: editEntry.listened_at,
            album: {
              id: editEntry.albums!.id,
              title: editEntry.albums!.title,
              artist: editEntry.albums!.artist,
              cover_url: editEntry.albums!.cover_url,
              score: 0,
            },
          } : undefined}
        />
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "24px 28px",
              maxWidth: 300, width: "100%",
              animation: "modalIn 0.18s ease-out",
            }}
          >
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              이 기록을 삭제할까요?
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
              삭제한 일기는 되돌릴 수 없어요.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "9px 0", backgroundColor: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: "9px 0", backgroundColor: "#c0392b", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사진 확대 */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            backgroundColor: "rgba(0,0,0,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImage}
            alt="확대 사진"
            style={{ maxWidth: "100%", maxHeight: "92dvh", objectFit: "contain", borderRadius: 6 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function DiaryEntry({
  entry,
  noteExpanded,
  onToggleNote,
  onEdit,
  onDeleteRequest,
  onImageClick,
}: {
  entry: DiaryEntry;
  noteExpanded: boolean;
  onToggleNote: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onImageClick: () => void;
}) {
  const NOTE_LIMIT = 160;
  const note = entry.note ?? "";
  const isLong = note.length > NOTE_LIMIT;
  const displayNote = noteExpanded || !isLong ? note : note.slice(0, NOTE_LIMIT) + "...";

  return (
    <div style={{
      borderLeft: "2px solid var(--accent)",
      paddingLeft: 18,
      opacity: 1,
    }}>
      {/* 사진 */}
      {entry.image_url && (
        <button
          onClick={onImageClick}
          style={{
            display: "block", width: "100%", padding: 0, border: "none",
            background: "none", cursor: "pointer",
            marginBottom: 14, borderRadius: 8, overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.image_url}
            alt="청음 사진"
            style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
          />
        </button>
      )}

      {/* 앨범 정보 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: note || (entry.context?.length ?? 0) > 0 ? 14 : 0,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 5,
          overflow: "hidden", flexShrink: 0,
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
          {entry.albums?.cover_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={entry.albums.cover_url} alt={entry.albums.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "var(--text-muted)" }}>♪</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.albums?.title}
            </p>
            {entry.relistened && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: 3, padding: "1px 5px",
                letterSpacing: "0.05em", flexShrink: 0,
              }}>
                재청취
              </span>
            )}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.albums?.artist}
          </p>
        </div>
        {/* 편집/삭제 */}
        <div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "4px 6px", opacity: 0.6 }}>편집</button>
          <button onClick={onDeleteRequest} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "4px 6px", opacity: 0.6 }}>삭제</button>
        </div>
      </div>

      {/* 메모 — 일기의 중심 */}
      {note && (
        <div style={{ marginBottom: (entry.context?.length ?? 0) > 0 ? 12 : 0 }}>
          <p style={{
            color: "var(--text)",
            fontSize: 14,
            lineHeight: 1.85,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            letterSpacing: "-0.01em",
          }}>
            {displayNote}
          </p>
          {isLong && (
            <button
              onClick={onToggleNote}
              style={{
                background: "none", border: "none",
                color: "var(--text-muted)", fontSize: 11,
                cursor: "pointer", padding: "4px 0 0 0",
                opacity: 0.7,
              }}
            >
              {noteExpanded ? "접기 ↑" : "더 보기 ↓"}
            </button>
          )}
        </div>
      )}

      {/* 태그 — 조용하게 */}
      {entry.context && entry.context.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {entry.context.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 8px",
                borderRadius: 20,
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: 10,
                letterSpacing: "0.01em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
