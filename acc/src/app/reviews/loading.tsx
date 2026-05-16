const ROW_COUNT = 8;

function ReviewRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
      {/* 앨범 커버 */}
      <div className="skeleton-shimmer" style={{ width: 44, height: 44, borderRadius: 4, flexShrink: 0 }} />
      {/* 점수 뱃지 */}
      <div className="skeleton-shimmer" style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }} />
      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 12, width: "55%", borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
        <div style={{ height: 10, width: "35%", borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
      </div>
      {/* 유저 + 날짜 */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <div className="skeleton-shimmer" style={{ width: 20, height: 20, borderRadius: "50%" }} />
        <div style={{ height: 9, width: 36, borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 0" }}>
      {/* 페이지 타이틀 */}
      <div style={{ padding: "0 14px", marginBottom: 20 }}>
        <div style={{ height: 14, width: 60, borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
      </div>

      {/* 리뷰 행 목록 */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {Array.from({ length: ROW_COUNT }).map((_, i) => (
          <ReviewRow key={i} />
        ))}
      </div>
    </div>
  );
}
