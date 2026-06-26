import type { ReactNode } from "react";

const SKEL = {
  backgroundColor: "var(--bg-elevated)",
  borderRadius: 4,
} as const;

const CARD = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  marginBottom: 16,
} as const;

function SkeletonRows({ count = 4, imgSize = 40 }: { count?: number; imgSize?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...SKEL, width: imgSize, height: imgSize, borderRadius: 6, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...SKEL, width: "68%", height: 13, marginBottom: 5 }} />
            <div style={{ ...SKEL, width: "42%", height: 11 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonCard({ children, padding = "20px 24px" }: { children: ReactNode; padding?: string }) {
  return <div style={{ ...CARD, padding }}>{children}</div>;
}

export default function Loading() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100dvh" }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px calc(80px + env(safe-area-inset-bottom))" }}>

        {/* 프로필 헤더 */}
        <SkeletonCard>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ ...SKEL, width: 56, height: 56, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...SKEL, width: 160, height: 18, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ ...SKEL, width: 58, height: 13 }} />
                <div style={{ ...SKEL, width: 68, height: 13 }} />
                <div style={{ ...SKEL, width: 52, height: 13 }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <div style={{ ...SKEL, width: 50, height: 20, borderRadius: 4 }} />
                <div style={{ ...SKEL, width: 66, height: 20, borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </SkeletonCard>

        {/* 명반전 */}
        <SkeletonCard padding="18px 24px">
          <div style={{ ...SKEL, width: 60, height: 14, margin: "0 auto 18px" }} />
          <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ ...SKEL, width: 76, height: 76, borderRadius: 8, flexShrink: 0 }} />
            ))}
          </div>
        </SkeletonCard>

        {/* 점수 분포 */}
        <SkeletonCard>
          <div style={{ ...SKEL, width: 70, height: 12, marginBottom: 18 }} />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
            {[55, 30, 45, 80, 100, 70, 60, 40].map((h, i) => (
              <div key={i} style={{ ...SKEL, flex: 1, height: `${h}%`, borderRadius: 4 }} />
            ))}
          </div>
        </SkeletonCard>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[4, 4, 3, 3].map((rows, i) => (
            <div key={i} style={{ ...CARD, padding: "20px 24px", marginBottom: 0 }}>
              <div style={{ ...SKEL, width: 80, height: 12, marginBottom: 16 }} />
              <SkeletonRows count={rows} />
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
