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

  // AlbumCard가 router.push를 호출한 직후, pathname이 아직 /album/에 안착하기 전의
  // 짧은 윈도우 동안 navigation-away 감지 로직이 모달을 닫는 race condition을 방지
  const openingRef = useRef(false);
  const openingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // open-album-modal 이벤트 → 즉시 모달 표시
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, album } = (e as CustomEvent<{ id: string; album: AlbumWithRatings }>).detail;
      openingRef.current = true;
      if (openingTimerRef.current) clearTimeout(openingTimerRef.current);
      // RSC 응답이 늦어도 5초 후엔 가드 강제 해제 (최후 안전망)
      openingTimerRef.current = setTimeout(() => { openingRef.current = false; }, 5000);
      setModal({ albumId: id, album });
    };
    window.addEventListener("open-album-modal", handler);
    return () => {
      window.removeEventListener("open-album-modal", handler);
      if (openingTimerRef.current) clearTimeout(openingTimerRef.current);
    };
  }, []);

  // pathname 변화 처리: /album/ 착지 시 opening 가드 해제, 이탈 시 모달 닫기
  useEffect(() => {
    if (pathname.startsWith("/album/")) {
      // RSC 착지 확인 → opening 가드 즉시 해제
      openingRef.current = false;
      if (openingTimerRef.current) { clearTimeout(openingTimerRef.current); openingTimerRef.current = null; }
    } else if (modal && !openingRef.current) {
      // /album/ 외부로 이동했고 opening 중이 아닐 때만 닫기
      setModal(null);
    }
  }, [pathname, modal]);

  // 명시적 닫기 (버튼/백드롭/스와이프): pathname 상태 무관, 즉시 닫기
  const handleClose = useCallback(() => {
    setModal(null);
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
