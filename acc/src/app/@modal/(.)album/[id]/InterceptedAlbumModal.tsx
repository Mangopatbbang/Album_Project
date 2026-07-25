"use client";

import { useEffect } from "react";
import { consumeCardOpened } from "@/lib/albumModalStore";
import type { AlbumWithRatings } from "@/types";

// 카드 클릭 → GlobalAlbumModalOverlay가 이미 모달 표시 중, 여기선 아무것도 안 함
// 직접 URL 접근 (/album/123 입력 or 공유 링크) → fetch 후 overlay에 이벤트 전달
export default function InterceptedAlbumModal({ albumId }: { albumId: string }) {
  useEffect(() => {
    if (consumeCardOpened(albumId)) return;  // 카드 클릭 경로

    const controller = new AbortController();
    fetch(`/api/albums/${albumId}`, { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((album: AlbumWithRatings) => {
        window.dispatchEvent(new CustomEvent("open-album-modal", { detail: { id: albumId, album } }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [albumId]);

  return null;
}
