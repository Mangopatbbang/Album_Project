"use client";

import { useRef, useState, useEffect } from "react";
import ProfileShareCard from "@/components/profile/ProfileShareCard";
import { captureToBlob, downloadBlob } from "@/lib/capture";
import { useToast } from "@/components/ui/Toast";

export type ProfileCardData = {
  displayName: string;
  displayEmoji: string;
  avatarUrl: string | null;
  bio: string | null;
  total: number;
  avg: string | null;
  topGenres: string[];
  topReview: { text: string; albumTitle: string; coverUrl: string | null; score: number } | null;
  coverUrls: (string | null)[];
};

type Props = ProfileCardData & { onClose: () => void };

export default function ProfileShareModal({ onClose, ...cardData }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    const update = () => {
      const scaleW = Math.min(1, (window.innerWidth - 32) / 360);
      const scaleH = Math.min(1, (window.innerHeight - 160) / 640);
      setCardScale(Math.min(scaleW, scaleH));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const filename = `${cardData.displayName.replace(/[<>:"/\\|?*]/g, "")}_profile.png`;

  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const canShare = (() => {
    if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
    try { return navigator.canShare({ files: [new File([], "test.png", { type: "image/png" })] }); } catch { return false; }
  })();

  const handleSave = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    try {
      const blob = await captureToBlob(cardRef.current);
      if (!blob) { showToast("이미지 생성에 실패했어요", "error"); return; }
      if (canShare) {
        const file = new File([blob], filename, { type: "image/png" });
        try { await navigator.share({ files: [file] }); onClose(); } catch { /* 취소 */ }
      } else {
        downloadBlob(blob, filename);
        showToast("이미지가 저장됐어요");
        onClose();
      }
    } catch {
      showToast("이미지 생성에 실패했어요", "error");
    } finally {
      setCapturing(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    try {
      const blob = await captureToBlob(cardRef.current);
      if (!blob) { showToast("이미지 생성에 실패했어요", "error"); return; }
      const file = new File([blob], filename, { type: "image/png" });
      try { await navigator.share({ files: [file] }); onClose(); } catch { /* 취소 */ }
    } catch {
      showToast("이미지 생성에 실패했어요", "error");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.90)",
        zIndex: 200, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "20px 16px", gap: 16, overflowY: "auto",
      }}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdrop.current && e.target === backdropRef.current && !capturing) onClose();
        mouseDownOnBackdrop.current = false;
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: 10, right: 12,
          color: "rgba(255,255,255,0.55)", background: "none", border: "none",
          fontSize: 20, cursor: "pointer", lineHeight: 1, padding: 10, zIndex: 201,
        }}
      >
        ✕
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flexShrink: 0,
          width: 360 * cardScale, height: 640 * cardScale,
          overflow: "hidden", borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
        }}
      >
        <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top left", width: 360, height: 640 }}>
          <ProfileShareCard containerRef={cardRef} {...cardData} />
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        {canShare && (
          <button
            onClick={handleShare}
            disabled={capturing}
            style={{
              padding: "10px 28px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.35)", background: "none",
              color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: capturing ? "default" : "pointer", opacity: capturing ? 0.5 : 1,
            }}
          >
            공유하기
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={capturing}
          style={{
            padding: "10px 28px", borderRadius: 8, border: "none",
            background: "rgba(255,255,255,0.14)", color: "#fff",
            fontSize: 14, fontWeight: 600,
            cursor: capturing ? "default" : "pointer", opacity: capturing ? 0.5 : 1,
          }}
        >
          {capturing ? "처리 중…" : (isIOS && canShare) ? "공유 / 저장" : "저장"}
        </button>
      </div>
    </div>
  );
}
