"use client";

import { useState } from "react";
import AlbumModal from "@/components/album/AlbumModal";
import { AlbumWithRatings } from "@/types";

type BasicAlbum = {
  id: string;
  title: string;
  artist: string;
  cover_url?: string | null;
  year?: string | null;
  genre?: string | null;
};

type Props = {
  album: BasicAlbum;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hoverOpacity?: boolean;
};

export default function AlbumCoverButton({ album, children, style, className, hoverOpacity }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const albumWithRatings: AlbumWithRatings = {
    id: album.id,
    title: album.title,
    artist: album.artist,
    cover_url: album.cover_url ?? undefined,
    year: album.year ?? undefined,
    genre: album.genre ?? undefined,
    ratings: [],
  };

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "pointer", opacity: hoverOpacity && hovered ? 0.75 : 1, transition: "opacity 0.15s", ...style }}
        className={className}
      >
        {children}
      </div>
      {open && (
        <AlbumModal album={albumWithRatings} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
