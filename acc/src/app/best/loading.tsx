function TileRow({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: 84, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="skeleton-shimmer" style={{ width: 84, height: 84, borderRadius: 8 }} />
          <div style={{ height: 10, width: "70%", borderRadius: 3, backgroundColor: "var(--bg-elevated)" }} />
          <div style={{ height: 9, width: "45%", borderRadius: 3, backgroundColor: "var(--bg-elevated)" }} />
        </div>
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      {/* 필터 바 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
        <div className="skeleton-shimmer" style={{ width: 110, height: 32, borderRadius: 8 }} />
        <div className="skeleton-shimmer" style={{ width: 90, height: 32, borderRadius: 8 }} />
      </div>

      {/* 섹션 × 4 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {[6, 5, 6, 4].map((count, i) => (
          <div key={i}>
            <div style={{ height: 11, width: 80, borderRadius: 4, backgroundColor: "var(--bg-elevated)", marginBottom: 12 }} />
            <TileRow count={count} />
          </div>
        ))}
      </div>
    </div>
  );
}
