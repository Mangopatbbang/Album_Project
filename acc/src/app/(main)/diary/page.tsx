"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import DiaryEntryModal from "@/components/diary/DiaryEntryModal";

type DiaryAlbum = {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  score: number;
};

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

const SCORES = ["", "이건 좀", "음", "괜찮네", "좋네", "오", "워", "ㅠㅠ", "이게 뭐야"];

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    full: `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`,
    day: days[d.getDay()],
  };
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
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
  const { profile, authUser } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [expandedImages, setExpandedImages] = useState<string | null>(null);

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
    if (!authUser) {
      router.replace("/");
      return;
    }
    fetchEntries();
  }, [authUser, router, fetchEntries]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const yy = nowKst.getFullYear();
    const mm = String(nowKst.getMonth() + 1).padStart(2, "0");
    const prefix = `${yy}-${mm}`;
    return entries.filter((e) => e.listened_at.startsWith(prefix));
  }, [entries, filter]);

  // 날짜별 그룹핑
  const grouped = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of filtered) {
      const key = e.listened_at;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const recentTags = useMemo(() => getRecentTags(entries), [entries]);

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/listening-logs?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleteConfirm(null);
  };

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!authUser) return null;

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px calc(80px + env(safe-area-inset-bottom))" }}>

        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.04em" }}>
              청음일기
            </h1>
            {entries.length > 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>
                총 {entries.length}개의 기록
              </p>
            )}
          </div>
          <button
            onClick={() => { setEditEntry(null); setShowModal(true); }}
            style={{
              backgroundColor: "var(--accent)",
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              color: "var(--bg)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            + 새 기록
          </button>
        </div>

        {/* 필터 탭 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {(["all", "month"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                border: "1px solid var(--border)",
                backgroundColor: filter === f ? "var(--accent)" : "transparent",
                color: filter === f ? "var(--bg)" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: filter === f ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {f === "all" ? "전체" : "이달"}
            </button>
          ))}
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer" style={{ height: 100, borderRadius: 12 }} />
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && entries.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted)",
          }}>
            <p style={{ fontSize: 36, marginBottom: 16 }}>📖</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>
              첫 청음일기를 남겨볼까요
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>
              오늘 들은 앨범의 기록을 남겨보세요.<br />
              감정, 분위기, 그날의 순간이 쌓여갑니다.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                marginTop: 24,
                backgroundColor: "var(--accent)",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                color: "var(--bg)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              첫 기록 남기기
            </button>
          </div>
        )}

        {/* 필터 결과 없음 */}
        {!loading && entries.length > 0 && filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
            이달의 기록이 없어요
          </p>
        )}

        {/* 날짜별 엔트리 */}
        {!loading && grouped.map(([date, dayEntries]) => {
          const { full, day } = formatDateHeader(date);
          return (
            <div key={date} style={{ marginBottom: 32 }}>
              {/* 날짜 구분선 */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
              }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
                <p style={{
                  color: "var(--text-muted)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}>
                  {full} <span style={{ opacity: 0.6 }}>{day}요일</span>
                </p>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {dayEntries.map((entry) => (
                  <DiaryCard
                    key={entry.id}
                    entry={entry}
                    noteExpanded={expandedNotes.has(entry.id)}
                    onToggleNote={() => toggleNote(entry.id)}
                    onEdit={() => { setEditEntry(entry); setShowModal(true); }}
                    onDeleteRequest={() => setDeleteConfirm(entry.id)}
                    onImageClick={() => setExpandedImages(entry.image_url)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>

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
            backgroundColor: "rgba(0,0,0,0.7)",
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
              padding: "24px 28px",
              maxWidth: 320, width: "100%",
              animation: "modalIn 0.18s ease-out",
            }}
          >
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>일기를 삭제할까요?</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>삭제한 기록은 되돌릴 수 없어요.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "9px 0", backgroundColor: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{ flex: 1, padding: "9px 0", backgroundColor: "#e05050", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사진 확대 */}
      {expandedImages && (
        <div
          onClick={() => setExpandedImages(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            backgroundColor: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImages}
            alt="확대 사진"
            style={{ maxWidth: "100%", maxHeight: "90dvh", objectFit: "contain", borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function DiaryCard({
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
  const NOTE_LIMIT = 120;
  const note = entry.note ?? "";
  const isLong = note.length > NOTE_LIMIT;
  const displayNote = noteExpanded || !isLong ? note : note.slice(0, NOTE_LIMIT) + "...";

  return (
    <div style={{
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* 사진 */}
      {entry.image_url && (
        <button
          onClick={onImageClick}
          style={{ width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer", display: "block" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.image_url}
            alt="청음 사진"
            style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
          />
        </button>
      )}

      <div style={{ padding: "14px 16px" }}>
        {/* 앨범 + 메뉴 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: note || entry.context?.length ? 12 : 0 }}>
          {/* 앨범 커버 */}
          <div style={{
            width: 44, height: 44, borderRadius: 6,
            overflow: "hidden", flexShrink: 0,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
            {entry.albums?.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={entry.albums.cover_url} alt={entry.albums.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>♪</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {entry.albums?.title}
              </p>
              {entry.relistened && (
                <span style={{
                  fontSize: 9, fontWeight: 600, color: "var(--accent)",
                  border: "1px solid var(--accent)", borderRadius: 4,
                  padding: "1px 5px", flexShrink: 0, letterSpacing: "0.04em",
                }}>
                  재청취
                </span>
              )}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 1 }}>
              {entry.albums?.artist}
            </p>
          </div>

          {/* 편집/삭제 */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={onEdit}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}
              title="수정"
            >
              편집
            </button>
            <button
              onClick={onDeleteRequest}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}
              title="삭제"
            >
              삭제
            </button>
          </div>
        </div>

        {/* 메모 */}
        {note && (
          <div style={{ marginBottom: entry.context?.length ? 10 : 0 }}>
            <p style={{
              color: "var(--text)",
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {displayNote}
            </p>
            {isLong && (
              <button
                onClick={onToggleNote}
                style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: "4px 0 0 0", fontWeight: 500 }}
              >
                {noteExpanded ? "접기" : "더 보기"}
              </button>
            )}
          </div>
        )}

        {/* 태그 */}
        {entry.context && entry.context.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {entry.context.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "3px 9px",
                  borderRadius: 20,
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontSize: 11,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// suppress unused warning
void formatDateShort;
