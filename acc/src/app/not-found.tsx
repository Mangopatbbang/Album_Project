import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        gap: 14,
        backgroundColor: "var(--bg)",
      }}
    >
      <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
        404
      </p>
      <p style={{ color: "var(--text)", fontSize: 16, fontWeight: 600, margin: 0 }}>
        페이지를 찾을 수 없어요
      </p>
      <Link
        href="/"
        style={{
          padding: "8px 20px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          color: "var(--text-sub)",
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        홈으로
      </Link>
    </div>
  );
}
