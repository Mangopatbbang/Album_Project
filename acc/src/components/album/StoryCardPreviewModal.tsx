"use client";

import { useEffect, useRef, useState } from "react";
import StoryCard from "@/components/album/StoryCard";
import { captureToBlob, downloadBlob } from "@/lib/capture";

type Props = {
  title: string;
  artist: string;
  coverUrl: string | null | undefined;
  score: number;
  review: string | null | undefined;
  genre?: string | null;
  userName?: string;
  spotifyId?: string | null;
  onClose: () => void;
};

export default function StoryCardPreviewModal({
  title,
  artist,
  coverUrl,
  score,
  review,
  genre,
  userName,
  spotifyId,
  onClose,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [artistImageUrl, setArtistImageUrl] = useState<string | null>(null);

  // 아티스트 사진 fetch
  useEffect(() => {
    if (!artist) return;
    fetch(`/api/spotify/artist?name=${encodeURIComponent(artist)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.image_url) setArtistImageUrl(data.image_url); })
      .catch(() => {});
  }, [artist]);

  const filename = `${title.replace(/[<>:"/\\|?*]/g, "")}_card.png`;

  const waitForImages = () =>
    new Promise<void>((resolve) => {
      if (!cardRef.current) { resolve(); return; }
      const imgs = cardRef.current.querySelectorAll("img");
      const pending = Array.from(imgs).filter((img) => !img.complete);
      if (pending.length === 0) { resolve(); return; }
      let loaded = 0;
      const onLoad = () => { if (++loaded >= pending.length) resolve(); };
      pending.forEach((img) => {
        img.addEventListener("load", onLoad, { once: true });
        img.addEventListener("error", onLoad, { once: true });
      });
      setTimeout(resolve, 3000);
    });

  const handleSave = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    await waitForImages();
    const blob = await captureToBlob(cardRef.current);
    if (blob) downloadBlob(blob, filename);
    setCapturing(false);
    onClose();
  };

  const handleShare = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    await waitForImages();
    const blob = await captureToBlob(cardRef.current);
    if (blob) {
      const file = new File([blob], filename, { type: "image/png" });
      try {
        await navigator.share({ files: [file] });
      } catch {
        // 사용자 취소 무시
      }
    }
    setCapturing(false);
    onClose();
  };

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.canShare === "function";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.90)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        gap: 20,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      {/* 닫기 */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 16,
          right: 18,
          color: "rgba(255,255,255,0.55)",
          background: "none",
          border: "none",
          fontSize: 20,
          cursor: "pointer",
          lineHeight: 1,
          padding: "4px 6px",
          zIndex: 201,
        }}
      >
        ✕
      </button>

      {/* 카드 미리보기 — wrapper에 overflow/clipping 없음. 카드 자체가 borderRadius+overflow 처리 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.85)", borderRadius: 12, flexShrink: 0 }}
      >
        <StoryCard
          containerRef={cardRef}
          title={title}
          artist={artist}
          coverUrl={coverUrl}
          artistImageUrl={artistImageUrl}
          score={score}
          review={review}
          genre={genre}
          userName={userName}
          spotifyId={spotifyId}
        />
      </div>

      {/* 버튼 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", gap: 10, flexShrink: 0 }}
      >
        {canShare && (
          <button
            onClick={handleShare}
            disabled={capturing}
            style={{
              padding: "10px 28px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: capturing ? "default" : "pointer",
              opacity: capturing ? 0.5 : 1,
            }}
          >
            공유하기
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={capturing}
          style={{
            padding: "10px 28px",
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,0.14)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: capturing ? "default" : "pointer",
            opacity: capturing ? 0.5 : 1,
          }}
        >
          {capturing ? "처리 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
