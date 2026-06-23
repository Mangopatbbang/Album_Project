"use client";

import { useRef, useState, useEffect } from "react";
import ProfileShareCard from "@/components/profile/ProfileShareCard";
import { captureToBlob, downloadBlob } from "@/lib/capture";
import { useToast } from "@/components/ui/Toast";

export type HofAlbum = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  oneLineReview: string | null;
  score: number;
};

export type ProfileCardData = {
  displayName: string;
  displayEmoji: string;
  avatarUrl: string | null;
  bio: string | null;
  total: number;
  avg: string | null;
  topGenres: string[];
  favoriteArtist: { name: string; avg: string } | null;
  hofAlbums: HofAlbum[];
};

type Props = ProfileCardData & { onClose: () => void };

export default function ProfileShareModal({
  onClose,
  displayName, displayEmoji, avatarUrl, bio, total, avg,
  topGenres, favoriteArtist, hofAlbums,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const { showToast } = useToast();

  const hofWithReview = hofAlbums.filter(a => a.oneLineReview !== null);

  // ── 선택 상태 ──
  const [selectedStripIds, setSelectedStripIds] = useState<string[]>(() =>
    hofAlbums.slice(0, 3).map(a => a.id)
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(() =>
    hofWithReview.length > 0 ? hofWithReview[0].id : null
  );

  // ── 카드로 전달할 파생값 ──
  const cardCoverUrls: (string | null)[] = selectedStripIds.map(id =>
    hofAlbums.find(a => a.id === id)?.coverUrl ?? null
  );
  const quoteAlbum = selectedQuoteId ? hofAlbums.find(a => a.id === selectedQuoteId) ?? null : null;
  const cardTopReview = quoteAlbum?.oneLineReview
    ? { text: quoteAlbum.oneLineReview, albumTitle: quoteAlbum.title, coverUrl: quoteAlbum.coverUrl, score: quoteAlbum.score }
    : null;

  // ── 핸들러 ──
  const toggleStrip = (id: string) => {
    setSelectedStripIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };
  const toggleQuote = (id: string) => {
    setSelectedQuoteId(prev => (prev === id ? null : id));
  };

  useEffect(() => {
    const update = () => {
      const scaleW = Math.min(1, (window.innerWidth - 32) / 360);
      const scaleH = Math.min(1, (window.innerHeight - 260) / 640);
      setCardScale(Math.min(scaleW, scaleH));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const filename = `${displayName.replace(/[<>:"/\\|?*]/g, "")}_profile.png`;

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

  const THUMB = 54;

  return (
    <div
      ref={backdropRef}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)",
        zIndex: 200, display: "flex", flexDirection: "column",
        alignItems: "center", overflowY: "auto",
        padding: "52px 16px 32px",
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

      {/* 카드 프리뷰 */}
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
          <ProfileShareCard
            containerRef={cardRef}
            displayName={displayName} displayEmoji={displayEmoji}
            avatarUrl={avatarUrl} bio={bio} total={total} avg={avg}
            topGenres={topGenres} favoriteArtist={favoriteArtist}
            coverUrls={cardCoverUrls} topReview={cardTopReview}
          />
        </div>
      </div>

      {/* ── 앨범 선택 피커 ── */}
      {hofAlbums.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 360, marginTop: 20,
            display: "flex", flexDirection: "column", gap: 12,
          }}
        >
          {/* STRIP 선택 (3장) */}
          <div style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 12, padding: "12px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em" }}>
                STRIP 커버
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: selectedStripIds.length >= 3 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
                letterSpacing: "0.04em",
              }}>
                {selectedStripIds.length} / 3
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {hofAlbums.map(album => {
                const order = selectedStripIds.indexOf(album.id);
                const isSelected = order !== -1;
                return (
                  <button
                    key={album.id}
                    onClick={() => toggleStrip(album.id)}
                    title={`${album.title} — ${album.artist}`}
                    style={{
                      width: THUMB, height: THUMB, borderRadius: 6, overflow: "hidden",
                      border: isSelected ? "2px solid rgba(255,255,255,0.85)" : "2px solid transparent",
                      opacity: isSelected ? 1 : (selectedStripIds.length >= 3 ? 0.28 : 0.4),
                      cursor: !isSelected && selectedStripIds.length >= 3 ? "not-allowed" : "pointer",
                      position: "relative", padding: 0, background: "rgba(255,255,255,0.06)",
                      flexShrink: 0, transition: "opacity 0.15s, border-color 0.15s",
                    }}
                  >
                    {album.coverUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={album.coverUrl} alt={album.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <span style={{ fontSize: 18, color: "rgba(255,255,255,0.2)", lineHeight: `${THUMB}px` }}>♪</span>
                    }
                    {isSelected && (
                      <span style={{
                        position: "absolute", bottom: 2, right: 3,
                        width: 15, height: 15, borderRadius: "50%",
                        backgroundColor: "rgba(255,255,255,0.92)",
                        color: "#000", fontSize: 9, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1,
                      }}>
                        {order + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedStripIds.length >= 3 && (
              <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 8 }}>
                다른 앨범을 추가하려면 선택된 앨범을 먼저 해제하세요
              </p>
            )}
          </div>

          {/* QUOTE 선택 */}
          {hofWithReview.length > 0 && (
            <div style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em" }}>
                  QUOTE 앨범
                </span>
                {selectedQuoteId === null && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>미선택</span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {hofWithReview.map(album => {
                  const isSelected = selectedQuoteId === album.id;
                  return (
                    <button
                      key={album.id}
                      onClick={() => toggleQuote(album.id)}
                      title={`${album.title} — ${album.artist}`}
                      style={{
                        width: THUMB, height: THUMB, borderRadius: 6, overflow: "hidden",
                        border: isSelected ? "2px solid rgba(255,255,255,0.85)" : "2px solid transparent",
                        opacity: isSelected ? 1 : 0.38,
                        cursor: "pointer", position: "relative", padding: 0,
                        background: "rgba(255,255,255,0.06)", flexShrink: 0,
                        transition: "opacity 0.15s, border-color 0.15s",
                      }}
                    >
                      {album.coverUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={album.coverUrl} alt={album.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <span style={{ fontSize: 18, color: "rgba(255,255,255,0.2)", lineHeight: `${THUMB}px` }}>♪</span>
                      }
                      {isSelected && (
                        <span style={{
                          position: "absolute", bottom: 2, right: 3,
                          width: 15, height: 15, borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.92)",
                          color: "#000", fontSize: 10, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1,
                        }}>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", gap: 10, flexShrink: 0, marginTop: 20 }}
      >
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
