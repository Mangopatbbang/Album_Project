"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 14 }}>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>페이지를 불러오지 못했어요</p>
      <button
        onClick={reset}
        style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-sub)", fontSize: 13, cursor: "pointer" }}
      >
        다시 시도
      </button>
    </div>
  );
}
