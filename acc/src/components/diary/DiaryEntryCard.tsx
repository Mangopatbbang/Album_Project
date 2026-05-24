"use client";

import { useState } from "react";
import { DiaryEntry } from "@/types/diary";

type Props = {
  entry: DiaryEntry;
  onEdit: () => void;
  onDeleteRequest: () => void;
};

const NOTE_LIMIT = 160;

export default function DiaryEntryCard({ entry, onEdit, onDeleteRequest }: Props) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const note = entry.note ?? "";
  const isLong = note.length > NOTE_LIMIT;
  const displayNote = noteExpanded || !isLong ? note : note.slice(0, NOTE_LIMIT) + "...";

  return (
    <>
      <div style={{ borderLeft: "2px solid var(--accent)", paddingLeft: 16 }}>
        {/* 사진 */}
        {entry.image_url && (
          <button
            onClick={() => setImageExpanded(true)}
            style={{
              display: "block", width: "100%", padding: 0, border: "none",
              background: "none", cursor: "pointer",
              marginBottom: 14, borderRadius: 8, overflow: "hidden",
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

        {/* 앨범 정보 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: note || (entry.context?.length ?? 0) > 0 ? 14 : 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 5,
            overflow: "hidden", flexShrink: 0,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
            {entry.albums?.cover_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={entry.albums.cover_url} alt={entry.albums.title ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "var(--text-muted)" }}>♪</span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{
                color: "var(--text)", fontSize: 13, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontFamily: "var(--font-playfair, serif)",
              }}>
                {entry.albums?.title}
              </p>
              {entry.relistened && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: "var(--accent)",
                  border: "1px solid rgba(var(--accent-rgb), 0.3)",
                  borderRadius: 3, padding: "1px 5px",
                  letterSpacing: "0.05em", flexShrink: 0,
                }}>
                  재청취
                </span>
              )}
            </div>
            <p style={{
              color: "var(--text-muted)", fontSize: 11, marginTop: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {entry.albums?.artist}
            </p>
          </div>

          <div style={{ display: "flex", flexShrink: 0 }}>
            <button onClick={onEdit} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "4px 6px", opacity: 0.6 }}>편집</button>
            <button onClick={onDeleteRequest} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "4px 6px", opacity: 0.6 }}>삭제</button>
          </div>
        </div>

        {/* 메모 */}
        {note && (
          <div style={{ marginBottom: (entry.context?.length ?? 0) > 0 ? 12 : 0 }}>
            <p style={{
              color: "var(--text)", fontSize: 13.5, lineHeight: 1.9,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              letterSpacing: "-0.01em",
            }}>
              {displayNote}
            </p>
            {isLong && (
              <button
                onClick={() => setNoteExpanded((p) => !p)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-muted)", fontSize: 11,
                  cursor: "pointer", padding: "4px 0 0 0", opacity: 0.7,
                }}
              >
                {noteExpanded ? "접기 ↑" : "더 보기 ↓"}
              </button>
            )}
          </div>
        )}

        {/* 태그 */}
        {entry.context && entry.context.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {entry.context.map((tag) => (
              <span key={tag} style={{
                padding: "2px 8px", borderRadius: 20,
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: 10, letterSpacing: "0.01em",
              }}>
                {tag}
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
