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
  const [includeUserName, setIncludeUserName] = useState(true);
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
      try { await navigator.share({ files: [file] }); onClose(); } catch { /* 취소 — 모달 유지 */ }
    } catch {
      showToast("이미지 생성에 실패했어요", "error");
    } finally {
      setCapturing(false);
    }
  };

  const cardProps = {
    title,
    artist,
    coverUrl,
    score: displayScore,
    review: includeReview ? (review ?? null) : null,
    genre,
    userName: includeUserName ? userName : undefined,
    spotifyId,
    likedTracks: includeTracks ? likedTracks : undefined,
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

      {/* 카드 미리보기 */}
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
          <StoryCard containerRef={cardRef} {...cardProps} />
        </div>
      </div>

      {/* 옵션 + 버튼 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flexShrink: 0 }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {avgScore != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, overflow: "hidden", fontSize: 12, fontWeight: 600 }}>
              <button
                onClick={() => setUseAvgScore(false)}
                style={{ padding: "6px 16px", background: !useAvgScore ? "rgba(255,255,255,0.16)" : "none", color: !useAvgScore ? "#fff" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", transition: "opacity 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s" }}
              >
                내 점수
              </button>
              <button
                onClick={() => setUseAvgScore(true)}
                style={{ padding: "6px 16px", background: useAvgScore ? "rgba(255,255,255,0.16)" : "none", color: useAvgScore ? "#fff" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", transition: "opacity 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s" }}
              >
                평균 점수
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {review && (
              <button
                onClick={() => setIncludeReview((v) => !v)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 20,
                  border: `1px solid ${includeReview ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"}`,
                  background: includeReview ? "rgba(255,255,255,0.14)" : "none",
                  color: includeReview ? "#fff" : "rgba(255,255,255,0.3)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s",
                }}
              >
                한줄평
              </button>
            )}
            {likedTracks && likedTracks.length > 0 && (
              <button
                onClick={() => setIncludeTracks((v) => !v)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 20,
                  border: `1px solid ${includeTracks ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"}`,
                  background: includeTracks ? "rgba(255,255,255,0.14)" : "none",
                  color: includeTracks ? "#fff" : "rgba(255,255,255,0.3)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s",
                }}
              >
                Best Tracks
              </button>
            )}
            {userName && (
              <button
                onClick={() => setIncludeUserName((v) => !v)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 20,
                  border: `1px solid ${includeUserName ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"}`,
                  background: includeUserName ? "rgba(255,255,255,0.14)" : "none",
                  color: includeUserName ? "#fff" : "rgba(255,255,255,0.3)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s",
                }}
              >
                닉네임
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {canShare && (
            <button
              onClick={handleShare}
              disabled={capturing}
              style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.35)", background: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: capturing ? "default" : "pointer", opacity: capturing ? 0.5 : 1 }}
            >
              공유하기
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={capturing}
            style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.14)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: capturing ? "default" : "pointer", opacity: capturing ? 0.5 : 1 }}
          >
            {capturing ? "처리 중…" : (isIOS && canShare) ? "공유 / 저장" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
