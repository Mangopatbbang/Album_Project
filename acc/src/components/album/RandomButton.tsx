"use client";

import { useState } from "react";
import { AlbumWithRatings } from "@/types";
import AlbumModal from "./AlbumModal";

export default function RandomButton() {
  const [loading, setLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithRatings | null>(null);

  const handleRandom = async () => {
    setLoading(true);
    const res = await fetch("/api/albums/random");
    const data = await res.json();
    setLoading(false);
    if (data.id) setSelectedAlbum(data as AlbumWithRatings);
  };

  return (
    <>
      <button
        onClick={handleRandom}
        disabled={loading}
        style={{
          width: 80,
          height: 80,
          border: "1px solid var(--border-light)",
          backgroundColor: "var(--bg-card)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.5 : 1,
          transition: "border-color 0.15s, background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--bg-elevated)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-light)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--bg-card)";
        }}
      >
        <span style={{ fontSize: 26, lineHeight: 1 }}>{loading ? "⏳" : "🎲"}</span>
        <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" }}>
          {loading ? "찾는 중..." : "오늘의 인연"}
        </span>
      </button>
      {selectedAlbum && (
        <AlbumModal album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />
      )}
    </>
  );
}
