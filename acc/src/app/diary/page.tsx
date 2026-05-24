"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { DiaryEntry } from "@/types/diary";
import { SAMPLE_DIARY_ENTRIES } from "@/lib/diarySampleData";
import DiaryEntryModal from "@/components/diary/DiaryEntryModal";
import RecordsTab from "@/components/diary/tabs/RecordsTab";
import CalendarTab from "@/components/diary/tabs/CalendarTab";
import AlbumsTab from "@/components/diary/tabs/AlbumsTab";
import StatsTab from "@/components/diary/tabs/StatsTab";

type Tab = "records" | "calendar" | "albums" | "stats";

const TABS: { id: Tab; label: string }[] = [
  { id: "records", label: "기록" },
  { id: "calendar", label: "캘린더" },
  { id: "albums", label: "앨범별" },
  { id: "stats", label: "통계" },
];

function getRecentTags(entries: DiaryEntry[]): string[] {
  const freq = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.context ?? []) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
}

export default function DiaryPage() {
  const { authUser } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("records");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<DiaryEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/listening-logs?userId=${authUser.id}&limit=500`);
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

  const isSample = !loading && entries.length === 0;
  const displayEntries = isSample ? SAMPLE_DIARY_ENTRIES : entries;
  const recentTags = useMemo(() => getRecentTags(entries), [entries]);

  const handleDelete = useCallback(async (id: string) => {
    await apiFetch(`/api/listening-logs?id=${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleEdit = useCallback((entry: DiaryEntry) => {
    setEditEntry(entry);
    setShowModal(true);
  }, []);

  const openNewEntry = useCallback(() => {
    setEditEntry(null);
    setShowModal(true);
  }, []);

  if (!authUser) return null;

  return (
    <>
      <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>

        {/* 페이지 타이틀 + 탭 */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 24px 0" }}>
          {/* 상단: 제목 + 기록 버튼 */}
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 20,
          }}>
            <div>
              <p style={{
                color: "rgba(212,165,116,0.55)", fontSize: 10, fontWeight: 600,
                letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 7,
              }}>
                Private
              </p>
              <h1 style={{
                color: "var(--text)", fontSize: 26, fontWeight: 800,
                letterSpacing: "-0.04em", lineHeight: 1,
              }}>
                청음일기
              </h1>
              {!isSample && entries.length > 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6 }}>
                  {entries.length}개의 기록
                </p>
              )}
            </div>

            <button
              onClick={openNewEntry}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                backgroundColor: "var(--accent)",
                border: "none", borderRadius: 8,
                padding: "8px 16px", marginTop: 4,
                color: "#1C1917", fontSize: 12, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>✎</span> 기록
            </button>
          </div>

          {/* 탭 pills */}
          <div style={{ display: "flex", gap: 5 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: activeTab === tab.id
                    ? "none"
                    : "1px solid var(--border)",
                  backgroundColor: activeTab === tab.id
                    ? "var(--accent)"
                    : "transparent",
                  color: activeTab === tab.id ? "#1C1917" : "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 예시 배너 */}
          {isSample && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 16,
              backgroundColor: "rgba(212,165,116,0.05)",
              border: "1px solid rgba(212,165,116,0.15)",
              borderRadius: 7, padding: "8px 12px",
            }}>
              <span style={{ color: "var(--accent)", fontSize: 11, flexShrink: 0, opacity: 0.7 }}>✦</span>
              <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
                예시 기록입니다. 첫 기록을 남겨보세요.
              </p>
            </div>
          )}

          {/* 구분선 */}
          <div style={{
            marginTop: 20, height: 1,
            background: "linear-gradient(90deg, rgba(212,165,116,0.3) 0%, var(--border) 25%, transparent 100%)",
          }} />
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "records" && (
          <RecordsTab
            entries={displayEntries}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onNewEntry={openNewEntry}
            isSample={isSample}
          />
        )}
        {activeTab === "calendar" && (
          <CalendarTab
            entries={displayEntries}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isSample={isSample}
          />
        )}
        {activeTab === "albums" && (
          <AlbumsTab
            entries={displayEntries}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isSample={isSample}
          />
        )}
        {activeTab === "stats" && (
          <StatsTab entries={displayEntries} />
        )}
      </div>

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
    </>
  );
}
