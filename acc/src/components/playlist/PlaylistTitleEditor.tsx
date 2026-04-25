"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PlaylistTitleEditor({
  playlistId,
  initialTitle,
  ownerId,
}: {
  playlistId: string;
  initialTitle: string;
  ownerId: string;
}) {
  const { profile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canEdit = profile && (profile.id === ownerId || profile.role === "admin");

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) { setEditing(false); setDraft(title); return; }
    setSaving(true);
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      setTitle(trimmed);
      setEditing(false);
      router.refresh();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); inputRef.current?.blur(); }
          if (e.key === "Escape") { setDraft(title); setEditing(false); }
        }}
        disabled={saving}
        autoFocus
        style={{
          color: "var(--text)",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.03em",
          marginBottom: 12,
          background: "transparent",
          border: "none",
          borderBottom: "2px solid var(--accent)",
          outline: "none",
          width: "100%",
          padding: "0 0 2px 0",
          opacity: saving ? 0.5 : 1,
        }}
      />
    );
  }

  return (
    <h1
      onClick={canEdit ? () => { setDraft(title); setEditing(true); } : undefined}
      style={{
        color: "var(--text)",
        fontWeight: 700,
        fontSize: 28,
        letterSpacing: "-0.03em",
        marginBottom: 12,
        cursor: canEdit ? "text" : "default",
      }}
      title={canEdit ? "클릭해서 제목 수정" : undefined}
    >
      {title}
    </h1>
  );
}
