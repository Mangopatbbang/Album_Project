"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AlbumModal from "@/components/album/AlbumModal";
import { consumeModal, clearModal } from "@/lib/albumModalStore";
import { AlbumWithRatings } from "@/types";

export default function InterceptedAlbumModal({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [album, setAlbum] = useState<AlbumWithRatings | null>(() => consumeModal(albumId));

  useEffect(() => {
    return () => clearModal(albumId);
  }, [albumId]);

  useEffect(() => {
    if (album) return;
    fetch(`/api/albums/${albumId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: AlbumWithRatings) => setAlbum(data))
      .catch(() => router.back());
  }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!album) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div
          style={{ backgroundColor: "var(--bg-card)", width: "100%", maxWidth: 520, overflow: "hidden", display: "flex", flexDirection: "column" }}
          className="rounded-t-2xl sm:rounded-2xl sm:mb-10 sm:max-h-[85dvh]"
        >
          <div className="sm:hidden" style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
          </div>
          <div className="skeleton-shimmer" style={{ width: "100%", aspectRatio: "16/7", flexShrink: 0 }} />
          <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="skeleton-shimmer" style={{ height: 22, width: "55%", borderRadius: 6 }} />
            <div className="skeleton-shimmer" style={{ height: 14, width: "38%", borderRadius: 6 }} />
            <div className="skeleton-shimmer" style={{ height: 14, width: "28%", borderRadius: 6, marginTop: 4 }} />
            <div className="skeleton-shimmer" style={{ height: 80, width: "100%", borderRadius: 8, marginTop: 8 }} />
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <AlbumModal
      album={album}
      onClose={() => router.back()}
      source="albums_grid"
      onSaved={async (albumId, updatedAlbum) => {
        if (updatedAlbum) {
          window.dispatchEvent(new CustomEvent("album-updated", { detail: { albumId, data: updatedAlbum } }));
          return;
        }
        const res = await fetch(`/api/albums/${albumId}?_=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) {
          window.dispatchEvent(new CustomEvent("album-deleted", { detail: { albumId } }));
          return;
        }
        const updated = await res.json();
        window.dispatchEvent(new CustomEvent("album-updated", { detail: { albumId, data: updated } }));
      }}
    />
  );
}
