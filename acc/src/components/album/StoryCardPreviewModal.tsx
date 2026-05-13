"use client";

import { useRef, useState, useEffect } from "react";
import StoryCard from "@/components/album/StoryCard";
import { captureToBlob, downloadBlob } from "@/lib/capture";
import { useToast } from "@/components/ui/Toast";

type Props = {
  title: string;
  artist: string;
  coverUrl: string | null | undefined;
  score: number;
  avgScore?: number | null;
  review: string | null | undefined;
  genre?: string | null;
  userName?: string;
  spotifyId?: string | null;
  likedTracks?: { index: number; name: string }[];
  onClose: () => void;
};

export default function StoryCardPreviewModal({
  title,
  artist,
  coverUrl,
  score,
  avgScore,
  review,
  genre,
  userName,
  spotifyId,
  likedTracks,
  onClose,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const [includeReview, setIncludeReview] = useState(true);
  const [includeTracks, setIncludeTracks] = useState(true);
  const [useAvgScore, setUseAvgScore] = useState(false);
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

  const displayScore = useAvgScore && avgScore != null ? avgScore : score;
  const filename = `${title.replace(/[<>:"/\\|?*]/g, "")}_card.png`;

  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

  const canShare = (() => {
    if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
    try {
      return navigator.canShare({ files: [new File([], "test.png", { type: "image/png" })] });
    } catch {
      return false;
    }
  })();

  const waitForImages = (el: HTMLElement) =>
    new Promise<void>((resolve) => {
      const imgs = el.querySelectorAll("img");
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

  const prepareCapture = async (): Promise<Blob | null> => {
    const el = cardRef.current;
    if (!el) return null;

    await waitForImages(el);
    if (document.fonts?.ready) await document.fonts.ready;

    // transform 제거 + overflow:hidden 클립 래퍼도 360×640으로 확장
    // 둘 다 안 하면 클립 래퍼(scaled 크기)가 콘텐츠를 잘라냄
    const scaleWrapper = el.parentElement as HTMLElement | null;
    const clipWrapper = scaleWrapper?.parentElement as HTMLElement | null;

    const origTransform = scaleWrapper?.style.transform ?? "";
    const origWidth = clipWrapper?.style.width ?? "";
    const origHeight = clipWrapper?.style.height ?? "";

    if (scaleWrapper) scaleWrapper.style.transform = "none";
    if (clipWrapper) { clipWrapper.style.width = "360px"; clipWrapper.style.height = "640px"; }

    try {
      return await captureToBlob(el, "#1a1817", 360, 640);
    } finally {
      if (scaleWrapper) scaleWrapper.style.transform = origTransform;
      if (clipWrapper) { clipWrapper.style.width = origWidth; clipWrapper.style.height = origHeight; }
    }
  };

  const handleSave = async () => {
    if (!cardRef.current || capturing) return;
    setCapturing(true);
    try {
      const blob = await prepareCapture();
      if (!blob) { showToast("이미지 생성에 실패했어요", "error"); return; }

      if (isIOS && canShare) {
        const file = new File([blob], filename, { type: "image/png" });
        try { await navigator.share({ files: [file] }); onClose(); } catch { /* 취소 — 모달 유지 */ }
      } else {
        downloadBlob(blob, filename);
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
      const blob = await prepareCapture();
      if (!blob) { showToast("이미지 생성에 실패했어요", "error"); return; }
      const file = new File([blob], filename, { type: "image/png" });
      try {
        await navigator.share({ files: [file] });
        onClose();
      } catch {
        // 사용자 취소 — 모달 유지
      }
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
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.90)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        gap: 16,
        overflowY: "auto",
      }}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => { if (mouseDownOnBackdrop.current && e.target === backdropRef.current && !capturing) onClose(); mouseDownOnBackdrop.current = false; }}
    >
      {/* 닫기 */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 10,
          right: 12,
          color: "rgba(255,255,255,0.55)",
          background: "none",
          border: "none",
          fontSize: 20,
          cursor: "pointer",
          lineHeight: 1,
          padding: 10,
          zIndex: 201,
        }}
      >
        ✕
      </button>

      {/* 카드 미리보기 — 뷰포트 좁을 때 scale 축소 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flexShrink: 0,
          width: 360 * cardScale,
          height: 640 * cardScale,
          overflow: "hidden",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
        }}
      >
        <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top left", width: 360, height: 640 }}>
          <StoryCard
            containerRef={cardRef}
            title={title}
            artist={artist}
            coverUrl={coverUrl}
            score={displayScore}
            review={includeReview ? (review ?? null) : null}
            genre={genre}
            userName={userName}
            spotifyId={spotifyId}
            likedTracks={includeTracks ? likedTracks : undefined}
          />
        </div>
      </div>

      {/* 옵션 + 버튼 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}
      >
        {/* 토글 옵션 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {avgScore != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, overflow: "hidden", fontSize: 12, fontWeight: 600 }}>
              <button
                onClick={() => setUseAvgScore(false)}
                style={{
                  padding: "6px 14px",
                  background: !useAvgScore ? "rgba(255,255,255,0.18)" : "none",
                  color: !useAvgScore ? "#fff" : "rgba(255,255,255,0.45)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                내 점수
              </button>
              <button
                onClick={() => setUseAvgScore(true)}
                style={{
                  padding: "6px 14px",
                  background: useAvgScore ? "rgba(255,255,255,0.18)" : "none",
                  color: useAvgScore ? "#fff" : "rgba(255,255,255,0.45)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                평균 점수
              </button>
            </div>
          )}
          {review && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 13, userSelect: "none" }}>
              <input
                type="checkbox"
                checked={includeReview}
                onChange={(e) => setIncludeReview(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#fff", cursor: "pointer" }}
              />
              한줄 평 포함
            </label>
          )}
          {likedTracks && likedTracks.length > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 13, userSelect: "none" }}>
              <input
                type="checkbox"
                checked={includeTracks}
                onChange={(e) => setIncludeTracks(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#fff", cursor: "pointer" }}
              />
              Best Tracks 포함
            </label>
          )}
        </div>

        {/* 저장/공유 버튼 */}
        <div style={{ display: "flex", gap: 10 }}>
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
            {capturing ? "처리 중…" : (isIOS && canShare) ? "공유 / 저장" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
