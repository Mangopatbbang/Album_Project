"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { DiaryEntry } from "@/types/diary";
import { SAMPLE_DIARY_ENTRIES } from "@/lib/diarySampleData";
import { supabaseBrowser as supabase } from "@/lib/supabase-browser";
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
  const [sampleEntries, setSampleEntries] = useState<DiaryEntry[]>([]);

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

  useEffect(() => {
    if (!isSample) return;
    supabase.from("albums").select("id, title, artist, cover_url")
      .not("cover_url", "is", null).order("id").limit(5)
      .then(({ data }) => {
        if (!data?.length) return;
        const NOTES: (string | null)[] = [
          "생각보다 훨씬 좋다.",
          "한 번에 다 듣진 못했다. 나중에 다시.",
          null,
          "처음 들었을 때랑 좀 다르게 들린다.",
          "출근길에 계속 틀었다.",
        ];
        const CONTEXTS = [
          ["퇴근 후", "이어폰", "차분한"],
          ["카페", "집중"],
          ["산책", "맑은날"],
          ["심야", "혼자"],
          ["출퇴근", "반복 청취"],
        ];
        const DAYS_AGO = [0, 1, 2, 14, 35];
        setSampleEntries(data.slice(0, 5).map((album, i) => ({
          id: `sample-${i}`,
          listened_at: new Date(Date.now() + 9 * 3600000 - DAYS_AGO[i] * 86400000).toISOString().slice(0, 10),
          note: NOTES[i] ?? null,
          context: CONTEXTS[i],
          image_url: null,
          relistened: [false, true, false, false, true][i],
          albums: { id: album.id, title: album.title, artist: album.artist, cover_url: album.cover_url },
        })));
      });
  }, [isSample]);

  const displayEntries = isSample
    ? (sampleEntries.length > 0 ? sampleEntries : SAMPLE_DIARY_ENTRIES)
    : entries;
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

        {/* 페이지 헤더 */}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 20px 0" }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 12,
          }}>
            {/* 제목 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 3, height: 22, borderRadius: 2,
                backgroundColor: "var(--accent)", opacity: 0.7, flexShrink: 0,
              }} />
              <div>
                <h1 style={{
                  color: "var(--text)", fontSize: 20, fontWeight: 700,
                  letterSpacing: "-0.03em", lineHeight: 1,
                }}>
                  청음일기
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4, letterSpacing: "0.04em" }}>
                  {!isSample && entries.length > 0 ? `${entries.length}개의 기록` : "PRIVATE"}
                </p>
              </div>
            </div>

            {/* 기록 버튼 */}
            <button
              onClick={openNewEntry}
              className="active:scale-[0.95]"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                backgroundColor: "var(--accent)",
                border: "none", borderRadius: 8,
                padding: "8px 15px",
                color: "#1C1917", fontSize: 12, fontWeight: 700,
                cursor: "pointer", letterSpacing: "-0.01em",
                transition: "opacity 0.12s, transform 0.12s",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>✎</span> 기록
            </button>
          </div>
        </div>

        {/* 탭 바 — 전체 너비 언더라인 스타일 */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          marginTop: 4,
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "14px 0",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                color: activeTab === tab.id ? "var(--text)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 0.15s",
                letterSpacing: "-0.01em",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 예시 배너 — 모든 탭에 공통 표시 */}
        {isSample && (
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "10px 20px 0" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              backgroundColor: "rgba(var(--accent-rgb), 0.05)",
              border: "1px solid rgba(var(--accent-rgb), 0.15)",
              borderRadius: 8, padding: "8px 12px",
            }}>
              <span style={{ color: "var(--accent)", fontSize: 10, flexShrink: 0, opacity: 0.6 }}>✦</span>
              <p style={{ color: "var(--text-muted)", fontSize: 11 }}>
                예시 기록입니다. 첫 기록을 남겨보세요.
              </p>
            </div>
          </div>
        )}

        {/* 탭 콘텐츠 */}
        {activeTab === "records" && (
          <div style={{ animation: "fadeUp 0.18s ease-out" }}>
            <RecordsTab
              entries={displayEntries}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onNewEntry={openNewEntry}
              isSample={isSample}
            />
          </div>
        )}
        {activeTab === "calendar" && (
          <div style={{ animation: "fadeUp 0.18s ease-out" }}>
            <CalendarTab
              entries={displayEntries}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isSample={isSample}
            />
          </div>
        )}
        {activeTab === "albums" && (
          <div style={{ animation: "fadeUp 0.18s ease-out" }}>
            <AlbumsTab
              entries={displayEntries}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isSample={isSample}
            />
          </div>
        )}
        {activeTab === "stats" && (
          <div style={{ animation: "fadeUp 0.18s ease-out" }}>
            <StatsTab entries={displayEntries} />
          </div>
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
