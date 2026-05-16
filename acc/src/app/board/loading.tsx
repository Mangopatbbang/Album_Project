function AnnouncementCard() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--border)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ height: 12, width: "80%", borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
        <div style={{ height: 12, width: "55%", borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
      </div>
      <div style={{ height: 10, width: 60, borderRadius: 4, backgroundColor: "var(--bg-elevated)" }} />
    </div>
  );
}

export default function Loading() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      {/* 페이지 타이틀 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ height: 16, width: 140, borderRadius: 5, backgroundColor: "var(--bg-elevated)" }} />
      </div>

      {/* 공지사항 섹션 */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ height: 11, width: 48, borderRadius: 3, backgroundColor: "var(--bg-elevated)" }} />
          <div style={{ height: 10, width: 20, borderRadius: 3, backgroundColor: "var(--bg-elevated)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AnnouncementCard />
          <AnnouncementCard />
        </div>
      </section>

      {/* 문의하기 섹션 */}
      <section>
        <div style={{ height: 11, width: 40, borderRadius: 3, backgroundColor: "var(--bg-elevated)", marginBottom: 16 }} />
        {/* 폼 영역 자리 */}
        <div
          className="skeleton-shimmer"
          style={{ height: 120, borderRadius: 8 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <div className="skeleton-shimmer" style={{ height: 36, borderRadius: 6 }} />
          <div className="skeleton-shimmer" style={{ height: 36, borderRadius: 6 }} />
        </div>
      </section>
    </main>
  );
}
