"use client";

import { useRouter } from "next/navigation";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

export default function InterceptedAlbumModal({ album }: { album: AlbumWithRatings }) {
  const router = useRouter();

  return (
    <AlbumModal
      album={album}
      onClose={() => router.back()}
      source="albums_grid"
      onSaved={async (albumId) => {
        const res = await fetch(`/api/albums/${albumId}`);
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
