"use client";

// AlbumModal — 명반전 상한(12장) 초과 시 밀어내기 UI (AlbumModal에서 분리, 동작 동일)
// 선택 앨범·새 점수·진행 상태는 부모의 handleEvict가 사용하므로 부모 소유, 값과 setter를 받는다.
// 노출 조건(hofLimitAlbums !== null)은 부모가 판단한다.
import { useState } from "react";
import { SCORE_COLORS } from "@/lib/score";

export type HofLimitAlbum = { id: string; title: string; artist: string; cover_url: string | null; updatedAt: string };

type Props = {
  albums: HofLimitAlbum[];
  evictAlbumId: string | null;
  setEvictAlbumId: (id: string | null) => void;
  evictScore: number | null;
  setEvictScore: (score: number | null) => void;
  evicting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function HofEvictPanel({
  albums, evictAlbumId, setEvictAlbumId, evictScore, setEvictScore, evicting, onConfirm, onCancel,
}: Props) {
  const [pressedEvictScore, setPressedEvictScore] = useState<number | null>(null);

  return (
    <div style={{
      marginTop: 12, padding: "16px",
      backgroundColor: "rgba(var(--accent-rgb), 0.05)",
      border: "1px solid rgba(var(--accent-rgb), 0.25)",
      borderRadius: 10,
      animation: "fadeUp 0.18s ease-out",
    }}>
      <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>
        명반전이 가득 찼어요 <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 11 }}>12 / 12</span>
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 14 }}>
        밀어낼 앨범을 선택하고, 새로 줄 점수를 정해주세요.
      </p>

      {/* 명반전 12장 커버 그리드 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {albums.map((a) => {
          const isSelected = evictAlbumId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => { setEvictAlbumId(isSelected ? null : a.id); setEvictScore(null); }}
              title={`${a.title} — ${a.artist}`}
              style={{ padding: 0, background: "none", border: "none", cursor: "pointer", position: "relative" }}
              className="active:scale-[0.92] transition-transform"
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 6, overflow: "hidden",
                backgroundColor: "var(--bg-elevated)",
                border: `2px solid ${isSelected ? "var(--error)" : "var(--border)"}`,
                opacity: evictAlbumId && !isSelected ? 0.45 : 1,
                transition: "border-color 0.15s, opacity 0.15s",
              }}>
                {a.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img loading="lazy" src={a.cover_url} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "var(--text-muted)", fontSize: 18 }}>♪</span></div>
                }
              </div>
              {isSelected && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 6,
                  backgroundColor: "rgba(var(--error-rgb), 0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <span style={{ fontSize: 18, color: "var(--error)" }}>✕</span>
                </div>
              )}
              </div>
              <span style={{
                fontSize: 11, color: isSelected ? "var(--error)" : "var(--text-muted)",
                maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                opacity: evictAlbumId && !isSelected ? 0.45 : 1,
                textAlign: "center", display: "block",
              }}>{a.title}</span>
            </button>
          );
        })}
      </div>

      {/* 선택된 앨범 이름 */}
      {evictAlbumId && (() => {
        const sel = albums.find((a) => a.id === evictAlbumId);
        if (!sel) return null;
        const d = new Date(sel.updatedAt);
        const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
        return (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            선택:{" "}
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{sel.title}</span>
            <span style={{ color: "var(--text-muted)" }}> — {sel.artist}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{" "}· {dateStr} 평가</span>
          </p>
        );
      })()}

      {/* 밀어낸 앨범 새 점수 선택 */}
      {evictAlbumId && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.04em" }}>밀어낸 앨범에 줄 새 점수</p>
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3,4,5,6,7].map((n) => {
              const color = SCORE_COLORS[n];
              const sel = evictScore === n;
              return (
                <button
                  key={n}
                  onClick={() => setEvictScore(n)}
                  onTouchStart={() => setPressedEvictScore(n)}
                  onTouchEnd={() => setPressedEvictScore(null)}
                  onTouchCancel={() => setPressedEvictScore(null)}
                  style={{
                    flex: 1, height: 34, borderRadius: 6,
                    border: sel ? `2px solid ${color}` : `1px solid ${color}44`,
                    backgroundColor: sel ? color : `${color}18`,
                    color: sel ? ([3,4,5].includes(n) ? "var(--bg)" : "#fff") : color,
                    fontWeight: sel ? 800 : 500, fontSize: 13,
                    cursor: "pointer", transition: "transform 0.12s, background-color 0.12s, border-color 0.12s",
                    transform: pressedEvictScore === n ? "scale(0.90)" : sel ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 확인 / 취소 */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: "8px 0", borderRadius: 6,
            backgroundColor: "transparent", border: "1px solid var(--border)",
            color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
          }}
        >
          취소
        </button>
        <button
          onClick={onConfirm}
          disabled={!evictAlbumId || evictScore === null || evicting}
          style={{
            flex: 2, padding: "8px 0", borderRadius: 6,
            backgroundColor: evictAlbumId && evictScore !== null ? "var(--accent)" : "var(--bg-elevated)",
            border: "none",
            color: evictAlbumId && evictScore !== null ? "var(--bg)" : "var(--text-muted)",
            fontWeight: 600, fontSize: 13,
            cursor: evictAlbumId && evictScore !== null && !evicting ? "pointer" : "not-allowed",
            opacity: evicting ? 0.5 : 1,
            transition: "opacity 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s",
          }}
        >
          {evicting ? "저장 중…" : "확인"}
        </button>
      </div>
    </div>
  );
}
