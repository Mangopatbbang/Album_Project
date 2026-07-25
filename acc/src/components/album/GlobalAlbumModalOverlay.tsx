"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import AlbumModal from "@/components/album/AlbumModal";
import type { AlbumWithRatings } from "@/types";

type ModalState = { albumId: string; album: AlbumWithRatings };

export default function GlobalAlbumModalOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState<ModalState | null>(null);
  // router.push 직후 pathname이 /albums인 상태에서 모달이 닫히는 race condition 방지
  const isOpeningRef = useRef(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; album: AlbumWithRatings }>).detail;
      isOpeningRef.current = true;
      setModal({ albumId: detail.id, album: detail.album });
    };
    window.addEventListener("open-album-modal", handler);
    return () => window.removeEventListener("open-album-modal", handler);
  }, []);

  // pathname이 /album/으로 안착하면 opening 플래그 해제
  useEffect(() => {
    if (pathname.startsWith("/album/")) {
      isOpeningRef.current = false;
    }
  }, [pathname]);

  // /album/ 벗어나면 모달 닫기 (opening 중에는 닫지 않음)
  useEffect(() => {
    if (modal && !isOpeningRef.current && !pathname.startsWith("/album/")) {
      setModal(null);
    }
  }, [pathname, modal]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSaved = useCallback(async (albumId: string, updatedAlbum?: AlbumWithRatings) => {
    if (updatedAlbum) {
      window.dispatchEvent(new CustomEvent("album-updated", { detail: { albumId, data: updatedAlbum } }));
      return;
    }
    const res = await fetch(`/api/albums/${albumId}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) {
      window.dispatchEvent(new CustomEvent("album-deleted", { detail: { albumId } }));
      return;
    }
    const updated: AlbumWithRatings = await res.json();
    window.dispatchEvent(new CustomEvent("album-updated", { detail: { albumId, data: updated } }));
  }, []);

  if (!modal) return null;

  return (
    <AlbumModal
      album={modal.album}
      onClose={handleClose}
      source="albums_grid"
      onSaved={handleSaved}
      zIndex={200}
    />
  );
}
