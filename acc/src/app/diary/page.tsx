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

        {/* 탭 바 */}
        <nav style={{
          position: "sticky", top: 52, zIndex: 40,
          backgroundColor: "rgba(28,25,23,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            maxWidth: 600, margin: "0 auto", padding: "0 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex" }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "0 12px", height: 44,
                    background: "none", border: "none",
                    borderBottom: `2px solid ${activeTab === tab.id ? "var(--accent)" : "transparent"}`,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: activeTab === tab.id ? 700 : 400,
                    color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
                    transition: "all 0.12s",
                    letterSpacing: activeTab === tab.id ? "-0.01em" : "0",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={openNewEntry}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                backgroundColor: "rgba(var(--accent-rgb), 0.14)",
                border: "1px solid rgba(var(--accent-rgb), 0.32)",
                borderRadius: 7, padding: "5px 12px",
                color: "var(--accent)", fontSize: 11, fontWeight: 700,
                cursor: "pointer", letterSpacing: "-0.01em",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>✎</span> 기록
            </button>
          </div>
        </nav>

        {/* 예시 배너 */}
        {isSample && (
          <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 24px 0" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              backgroundColor: "rgba(212,165,116,0.06)",
              border: "1px solid rgba(212,165,116,0.2)",
              borderRadius: 8, padding: "9px 14px",
            }}>
              <span style={{ color: "var(--accent)", fontSize: 12, flexShrink: 0 }}>✦</span>
              <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5 }}>
                아래는 예시 기록입니다. 첫 기록을 남겨보세요.
              </p>
            </div>
          </div>
        )}

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
