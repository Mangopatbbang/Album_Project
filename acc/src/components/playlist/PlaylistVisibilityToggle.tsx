"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function PlaylistVisibilityToggle({
  playlistId,
  ownerId,
  initialIsPublic,
}: {
  playlistId: string;
  ownerId: string;
  initialIsPublic: boolean;
}) {
  const { profile } = useAuth();
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);

  if (!profile || profile.id !== ownerId) return null;

  const toggle = async () => {
    const next = !isPublic;
    setIsPublic(next);
    setSaving(true);
    await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: next }),
    });
    setSaving(false);
    router.refresh();
  };

  return (
    <button
      onClick={toggle}
      disabled={saving}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "none", border: "none", cursor: saving ? "not-allowed" : "pointer",
        padding: 0, opacity: saving ? 0.6 : 1,
      }}
      title={isPublic ? "공개 중 — 클릭해서 비공개로 변경" : "비공개 — 클릭해서 공개로 변경"}
    >
      <div style={{
        width: 28, height: 16, borderRadius: 8,
        backgroundColor: isPublic ? "var(--accent)" : "var(--bg-elevated)",
        border: "1px solid var(--border)",
        position: "relative", transition: "background-color 0.2s",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 2,
          left: isPublic ? 12 : 2,
          width: 10, height: 10, borderRadius: "50%",
          backgroundColor: isPublic ? "var(--bg)" : "var(--text-muted)",
          transition: "left 0.2s",
        }} />
      </div>
      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
        {isPublic ? "공개" : "비공개"}
      </span>
    </button>
  );
}
