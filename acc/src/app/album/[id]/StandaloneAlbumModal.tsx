"use client";

import { useRouter } from "next/navigation";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

export default function StandaloneAlbumModal({ album }: { album: AlbumWithRatings }) {
  const router = useRouter();

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <AlbumModal
        album={album}
        onClose={() => router.push("/albums")}
        source="direct_url"
        onSaved={async (albumId, updatedAlbum) => {
          if (updatedAlbum) {
            window.dispatchEvent(new CustomEvent("album-updated", { detail: { albumId, data: updatedAlbum } }));
            return;
          }
          const res = await fetch(`/api/albums/${albumId}?_=${Date.now()}`, { cache: "no-store" });
          if (!res.ok) {
            router.push("/albums");
            return;
          }
          const updated = await res.json();
          window.dispatchEvent(new CustomEvent("album-updated", { detail: { albumId, data: updated } }));
        }}
      />
    </div>
  );
}
