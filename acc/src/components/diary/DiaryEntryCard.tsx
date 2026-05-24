"use client";

import { useState } from "react";
import { DiaryEntry } from "@/types/diary";

type Props = {
  entry: DiaryEntry;
  onEdit: () => void;
  onDeleteRequest: () => void;
  isSample?: boolean;
};

const NOTE_LIMIT = 160;

export default function DiaryEntryCard({ entry, onEdit, onDeleteRequest, isSample }: Props) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const note = entry.note ?? "";
  const isLong = note.length > NOTE_LIMIT;
  const displayNote = noteExpanded || !isLong ? note : note.slice(0, NOTE_LIMIT) + "...";

  return (
    <>
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: "14px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.2)",
          transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "rgba(196,170,124,0.25)";
          el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.38), 0 2px 6px rgba(0,0,0,0.24)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = "rgba(255,255,255,0.07)";
          el.style.boxShadow = "0 4px 20px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.2)";
        }}
      >
        {/* 앨범 + 액션 */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* 커버 */}
          <div style={{
            width: 52, height: 52, borderRadius: 8,
            overflow: "hidden", flexShrink: 0,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
            {entry.albums?.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img
                  src={entry.albums.cover_url}
                  alt={entry.albums.title ?? ""}
                  onLoad={() => setCoverLoaded(true)}
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
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
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
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
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
            borderLeft: "2px solid rgba(196,170,124,0.35)",
          }}>
            <p style={{
              color: "var(--text-muted)", fontSize: 13, lineHeight: 1.9,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              letterSpacing: "-0.005em",
              fontStyle: "italic",
              fontFamily: "var(--font-lora, Georgia, serif)",
            }}>
              {displayNote}
            </p>
            {isLong && (
              <button
                onClick={() => setNoteExpanded((p) => !p)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-muted)", fontSize: 11,
                  cursor: "pointer", padding: "4px 0 0 0",
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
            {entry.context.map((tag) => (
              <span key={tag} style={{
                padding: "3px 9px", borderRadius: 20,
                backgroundColor: "rgba(var(--accent-rgb), 0.07)",
                border: "1px solid rgba(var(--accent-rgb), 0.18)",
                color: "var(--text-muted)", fontSize: 10,
                letterSpacing: "0.01em",
              }}>
                #{tag}
              </span>
            ))}
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
