"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { DiaryEntry } from "@/types/diary";
import { SAMPLE_DIARY_ENTRIES } from "@/lib/diarySampleData";
import DiaryEntryModal from "@/components/diary/DiaryEntryModal";
import DiaryBook from "@/components/diary/DiaryBook";

function getRecentTags(entries: DiaryEntry[]): string[] {
  const freq = new Map<string, number>();
  for (const e of entries) {
    for (const t of e.context ?? []) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
}

export default function DiaryPage() {
  const { authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (authLoading) return;
    if (!authUser) { router.replace("/"); return; }
    fetchEntries();
  }, [authUser, authLoading, router, fetchEntries]);

  const isSample = !loading && entries.length === 0;
  const displayEntries = isSample ? SAMPLE_DIARY_ENTRIES : entries;
  const recentTags = useMemo(() => getRecentTags(entries), [entries]);

  const handleDelete = useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const res = await apiFetch(`/api/listening-logs?id=${id}`, { method: "DELETE" });
    if (!res.ok) fetchEntries();
  }, [fetchEntries]);

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
      <DiaryBook
        displayEntries={displayEntries}
        loading={loading}
        isSample={isSample}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onNewEntry={openNewEntry}
      />

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
