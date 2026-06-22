"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Entry = { id: string; title: string; artist: string; coverUrl: string | null };

function SortableItem({ entry, idx }: { entry: Entry; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? "var(--bg-elevated)" : "transparent",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
      {...attributes}
      {...listeners}
    >
      <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, width: 20, textAlign: "right", flexShrink: 0 }}>
        {String(idx + 1).padStart(2, "0")}
      </span>
      <div style={{ width: 36, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-elevated)" }}>
        {entry.coverUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img loading="lazy" src={entry.coverUrl} alt={entry.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 16 }}>♪</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</p>
        <p style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.artist}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    </div>
  );
}

type Props = {
  playlistId: string;
  ownerId: string;
  initialEntries: Entry[];
};

export default function PlaylistReorderButton({ playlistId, ownerId, initialEntries }: Props) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setEntries(initialEntries);
  }, [open, initialEntries]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  if (!profile || profile.id !== ownerId) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = entries.findIndex((e) => e.id === active.id);
    const newIdx = entries.findIndex((e) => e.id === over.id);
    setEntries(arrayMove(entries, oldIdx, newIdx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: entries.map((e) => e.id) }),
      });
      if (!res.ok) throw new Error("save failed");
      setOpen(false);
      window.location.reload();
    } catch {
      alert("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none", border: "1px solid var(--border)",
          borderRadius: 6, padding: "4px 10px",
          color: "var(--text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
        }}
        className="hover:text-[var(--text)] hover:border-[var(--border-light)] transition-colors"
      >
        순서 변경
      </button>

      {open && (
        <div
          ref={backdropRef}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 300 }}
          className="flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === backdropRef.current) setOpen(false); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 480, maxHeight: "80dvh",
              backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              animation: "modalIn 0.18s ease-out",
            }}
            className="rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>앨범 순서 변경</p>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1 }} className="touch-target">×</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px" }}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  {entries.map((entry, idx) => (
                    <SortableItem key={entry.id} entry={entry} idx={idx} />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0, paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
              <button
                onClick={() => setOpen(false)}
                style={{ flex: 1, padding: "10px 0", background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 2, padding: "10px 0", backgroundColor: "var(--accent)", border: "none", borderRadius: 8, color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}
              >
                {saving ? "저장 중..." : "순서 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
