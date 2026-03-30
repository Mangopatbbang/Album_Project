"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

type MinAlbum = { id: string; title: string; artist: string; cover_url: string | null };

export function ClickableAlbumRow({
  album,
  children,
}: {
  album: MinAlbum;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const albumForModal: AlbumWithRatings = {
    id: album.id,
    title: album.title,
    artist: album.artist,
    cover_url: album.cover_url ?? undefined,
    ratings: [],
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{ cursor: "pointer", transition: "opacity 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {children}
      </div>
      {open && (
        <AlbumModal album={albumForModal} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
