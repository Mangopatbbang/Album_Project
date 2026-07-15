"use client";

import { useEffect } from "react";

const BASE_SORT_OPTIONS = [
  { value: "newest", label: "아카이빙 최신순" },
  { value: "oldest", label: "아카이빙 오래된순" },
  { value: "release_desc", label: "발매일 최신순" },
  { value: "release_asc", label: "발매일 오래된순" },
  { value: "avg_desc", label: "평점 높은순" },
  { value: "avg_asc", label: "평점 낮은순" },
  { value: "title", label: "가나다순" },
];

const MY_SORT_OPTIONS = [
  { value: "my_desc", label: "내 평점 높은순" },
  { value: "my_asc", label: "내 평점 낮은순" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  genre: string;
  region: string;
  sort: string;
  unrated: boolean;
  myScore: number | null;
  genres: string[];
  hasProfile: boolean;
  onGenreChange: (v: string) => void;
  onRegionChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onUnratedToggle: () => void;
  onScoreFilter: (s: number) => void;
  onReset: () => void;
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 12,
};

const pill = (active: boolean, accent = false): React.CSSProperties => ({
  backgroundColor: active ? (accent ? "rgba(232,213,163,0.12)" : "var(--accent)") : "var(--bg-card)",
  border: `1px solid ${active ? (accent ? "rgba(232,213,163,0.45)" : "var(--accent)") : "var(--border)"}`,
  color: active ? (accent ? "var(--accent)" : "var(--bg)") : "var(--text-sub)",
  borderRadius: 20,
  padding: "7px 16px",
  fontSize: 13,
  fontWeight: active ? 700 : 400,
  cursor: "pointer",
  transition: "all 0.12s",
  whiteSpace: "nowrap" as const,
});

export default function AlbumFilterSheet({
  open, onClose,
  genre, region, sort, unrated, myScore,
  genres, hasProfile,
  onGenreChange, onRegionChange, onSortChange, onUnratedToggle, onScoreFilter, onReset,
}: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const allSortOptions = hasProfile ? [...BASE_SORT_OPTIONS, ...MY_SORT_OPTIONS] : BASE_SORT_OPTIONS;

  return (
    <>
      {/* 백드롭 */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 59,
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* 시트 패널 */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 60,
          backgroundColor: "var(--bg)",
          borderRadius: "20px 20px 0 0",
          maxHeight: "85dvh",
          overflowY: "auto",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
        }}
      >
        {/* 핸들 */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border)" }} />
        </div>

        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 20px 16px",
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>필터</span>
          <button
            onClick={onReset}
            style={{
              fontSize: 13, color: "var(--text-muted)", background: "none",
              border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 0",
            }}
          >
            초기화
          </button>
        </div>

        {/* 장르 */}
        <section style={{ padding: "20px 20px 0" }}>
          <p style={sectionLabel}>장르</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["", ...genres].map((g) => (
              <button key={g} onClick={() => onGenreChange(g)} style={pill(g === genre)}>
                {g === "" ? "전체" : g}
              </button>
            ))}
          </div>
        </section>

        {/* 정렬 */}
        <section style={{ padding: "24px 20px 0" }}>
          <p style={sectionLabel}>정렬</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allSortOptions.map((opt) => (
              <button key={opt.value} onClick={() => onSortChange(opt.value)} style={pill(sort === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* 지역 */}
        <section style={{ padding: "24px 20px 0" }}>
          <p style={sectionLabel}>지역</p>
          <div style={{ display: "flex", gap: 8 }}>
            {(["국내", "해외"] as const).map((r) => (
              <button key={r} onClick={() => onRegionChange(r)} style={pill(region === r, true)}>
                {r}
              </button>
            ))}
          </div>
        </section>

        {hasProfile && (
          <>
            {/* 미청음 */}
            <section style={{ padding: "24px 20px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, marginBottom: 3 }}>미청음만</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>아직 평점을 남기지 않은 앨범</p>
                </div>
                <button
                  onClick={onUnratedToggle}
                  aria-pressed={unrated}
                  style={{
                    width: 48, height: 28, borderRadius: 14,
                    backgroundColor: unrated ? "var(--accent)" : "var(--bg-card)",
                    border: `1px solid ${unrated ? "var(--accent)" : "var(--border)"}`,
                    position: "relative", cursor: "pointer",
                    transition: "background-color 0.2s, border-color 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3,
                    left: unrated ? 22 : 3,
                    width: 20, height: 20, borderRadius: "50%",
                    backgroundColor: unrated ? "var(--bg)" : "var(--text-muted)",
                    transition: "left 0.2s, background-color 0.2s",
                  }} />
                </button>
              </div>
            </section>

            {/* 내 평점 */}
            <section style={{ padding: "24px 20px 0" }}>
              <p style={sectionLabel}>내 평점</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                  const active = myScore === s;
                  return (
                    <button
                      key={s}
                      onClick={() => onScoreFilter(s)}
                      style={{
                        width: 36, height: 36,
                        backgroundColor: active ? "var(--accent)" : "var(--bg-card)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        color: active ? "var(--bg)" : "var(--text-sub)",
                        borderRadius: 8,
                        fontSize: 13, fontWeight: active ? 700 : 400,
                        cursor: "pointer", transition: "all 0.12s",
                        flexShrink: 0,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* 적용 버튼 */}
        <div style={{ padding: "28px 20px 0" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 14,
              padding: "14px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            적용
          </button>
        </div>
      </div>
    </>
  );
}
