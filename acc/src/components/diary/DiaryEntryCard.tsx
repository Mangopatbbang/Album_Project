"use client";

import { useEffect, useRef, useState } from "react";
import { DiaryEntry } from "@/types/diary";
import { getTagStyle } from "@/lib/diaryTagStyles";

const NOTE_LIMIT = 120;

type Props = {
  entry: DiaryEntry;
  onEdit: () => void;
  onDeleteRequest: () => void;
  isSample?: boolean;
  isNew?: boolean;
};

export default function DiaryEntryCard({ entry, onEdit, onDeleteRequest, isSample, isNew }: Props) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const note = entry.note ?? "";
  const isLong = note.length > NOTE_LIMIT;
  const displayNote = noteExpanded || !isLong ? note : note.slice(0, NOTE_LIMIT) + "...";

  /* ── 잉크 번짐 애니메이션 ── */
  const [revealPct, setRevealPct] = useState(110);
  const [inkActive, setInkActive] = useState(false);
  const animStarted = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!isNew || !note || animStarted.current) return;
    animStarted.current = true;
    setRevealPct(0);
    setInkActive(true);

    const duration = Math.min(Math.max(note.length * 22, 1400), 4500);
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (!mounted.current) return;
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / duration, 1);
      /* ease-in-out-cubic: 자연스러운 필기 리듬 */
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setRevealPct(eased * 108);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setRevealPct(110);
        setInkActive(false);
      }
    };
    requestAnimationFrame(tick);
  }, [isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAnimating = inkActive && revealPct < 108;
  const P = revealPct;
  /* reveal mask: 왼쪽 선명 → 88° 사선으로 soft fade → 오른쪽 숨김 */
  const sharpMask = `linear-gradient(88deg, black calc(${P}% - 14%), rgba(0,0,0,0.45) calc(${P}% - 7%), transparent ${P}%)`;
  /* wet-ink mask: leading edge 앞뒤로만 노출되는 blur zone */
  const inkMask = `linear-gradient(88deg, transparent calc(${P}% - 22%), rgba(0,0,0,0.6) calc(${P}% - 14%), black calc(${P}% - 5%), transparent ${P}%)`;

  return (
    <>
      <div
        className={isNew && !note ? "new-card-glow" : ""}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          borderRadius: 4,
          padding: "14px 16px",
          boxShadow: "1px 2px 8px rgba(var(--diary-ink-rgb), 0.08), 0 1px 1px rgba(var(--diary-ink-rgb), 0.04)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "var(--border)";
          el.style.boxShadow = "2px 4px 14px rgba(var(--diary-ink-rgb), 0.12), 0 1px 1px rgba(var(--diary-ink-rgb), 0.06)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "var(--border-light)";
          el.style.boxShadow = "1px 2px 8px rgba(var(--diary-ink-rgb), 0.08), 0 1px 1px rgba(var(--diary-ink-rgb), 0.04)";
        }}
      >
        {/* 앨범 + 액션 */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* 커버 */}
          <div style={{
            width: 52, height: 52, borderRadius: 4,
            overflow: "hidden", flexShrink: 0,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-light)",
          }}>
            {entry.albums?.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img
                  src={entry.albums.cover_url}
                  alt={entry.albums.title ?? ""}
                  onLoad={() => setCoverLoaded(true)}
                  onError={() => setCoverLoaded(true)}
                  style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    opacity: coverLoaded ? 1 : 0,
                    filter: coverLoaded ? "none" : "blur(8px)",
                    transition: "opacity 0.3s ease, filter 0.3s ease",
                  }}
                />
              : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--text-muted)", opacity: 0.4 }}>♪</span>
            }
          </div>

          {/* 앨범 정보 */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <p style={{
              color: "var(--text)", fontSize: 14, fontWeight: 700,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "var(--font-playfair, serif)", letterSpacing: "-0.01em",
            }}>
              {entry.albums?.title}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.albums?.artist}
            </p>
            {entry.relistened && (
              <span style={{
                display: "inline-block", marginTop: 5,
                fontSize: 9, fontWeight: 700,
                color: "var(--accent)",
                backgroundColor: "rgba(var(--accent-rgb), 0.1)",
                border: "1px solid rgba(var(--accent-rgb), 0.25)",
                borderRadius: 4, padding: "2px 6px",
                letterSpacing: "0.04em",
              }}>
                재청취
              </span>
            )}
          </div>

          {!isSample && (
            <div style={{ display: "flex", gap: 1, flexShrink: 0, paddingTop: 2 }}>
              <button
                onClick={onEdit}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-sub)", fontSize: 11,
                  cursor: "pointer", padding: "2px 6px",
                  transition: "color 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-sub)")}
              >
                편집
              </button>
              <button
                onClick={onDeleteRequest}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-sub)", fontSize: 11,
                  cursor: "pointer", padding: "2px 6px",
                  transition: "color 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-sub)")}
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {/* 사진 */}
        {entry.image_url && (
          <button
            onClick={() => setImageExpanded(true)}
            style={{
              display: "block", width: "100%", padding: 0, border: "none",
              background: "none", cursor: "pointer",
              marginTop: 12, borderRadius: 8, overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.image_url}
              alt="청음 사진"
              style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block", borderRadius: 8 }}
            />
          </button>
        )}

        {/* 메모 */}
        {note && (
          <div style={{
            marginTop: 12,
            paddingLeft: 12,
            borderLeft: "2px solid rgba(var(--accent-rgb), 0.45)",
          }}>
            {/* 내부 래퍼 — 절대 자식들의 기준점, 패딩 없음 */}
            <div style={{ position: "relative" }}>
              {/* ── 선명한 텍스트 (reveal mask 적용) ── */}
              <p style={{
                color: "var(--text-muted)", fontSize: 13, lineHeight: 1.9,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                letterSpacing: "-0.005em",
                fontStyle: "italic",
                fontFamily: "var(--font-lora, Georgia, serif)",
                margin: 0,
                ...(isAnimating && {
                  WebkitMaskImage: sharpMask,
                  maskImage: sharpMask,
                }),
              }}>
                {isAnimating ? note : displayNote}
              </p>

              {/* ── wet-ink blur 오버레이 ── */}
              {isAnimating && (
                <p
                  aria-hidden
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    color: "var(--text-muted)", fontSize: 13, lineHeight: 1.9,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    letterSpacing: "-0.005em",
                    fontStyle: "italic",
                    fontFamily: "var(--font-lora, Georgia, serif)",
                    margin: 0,
                    filter: "blur(2.5px)",
                    opacity: 0.55,
                    WebkitMaskImage: inkMask,
                    maskImage: inkMask,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {note}
                </p>
              )}

              {/* ── 잉크 glow (leading edge 빛 번짐) ── */}
              {isAnimating && (
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `calc(${P}% - 8%)`,
                  width: "14%",
                  background: "radial-gradient(ellipse at 40% 50%, rgba(var(--accent-rgb), 0.09), transparent 70%)",
                  pointerEvents: "none",
                }} />
              )}
            </div>

            {/* ── 더 보기 버튼 (애니메이션 중엔 숨김, 등장 시 fadeIn) ── */}
            {!isAnimating && isLong && (
              <button
                key="show-more"
                onClick={() => setNoteExpanded((p) => !p)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-muted)", fontSize: 11,
                  cursor: "pointer", padding: "4px 0 0 0",
                  animation: "fadeIn 0.15s ease-out both",
                }}
              >
                {noteExpanded ? "접기 ↑" : "더 보기 ↓"}
              </button>
            )}
          </div>
        )}

        {/* 태그 */}
        {entry.context && entry.context.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
            {entry.context.map((tag) => {
              const s = getTagStyle(tag);
              return (
                <span key={tag} style={{
                  display: "inline-flex", alignItems: "center", gap: s.isPreset ? 4 : 0,
                  padding: "3px 9px", borderRadius: 20,
                  backgroundColor: s.bg,
                  border: `1px solid ${s.border}`,
                  color: s.text,
                  fontSize: 10, letterSpacing: "0.02em",
                }}>
                  {s.isPreset && (
                    <span style={{ fontSize: 10, lineHeight: 1 }}>{s.icon}</span>
                  )}
                  #{tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 사진 확대 */}
      {imageExpanded && (
        <div
          onClick={() => setImageExpanded(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            backgroundColor: "rgba(0,0,0,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.image_url!}
            alt="확대 사진"
            style={{ maxWidth: "100%", maxHeight: "92dvh", objectFit: "contain", borderRadius: 6 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
