"use client";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteConfirmModal({ onConfirm, onCancel }: Props) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "24px 28px",
          maxWidth: 300, width: "100%",
          animation: "modalIn 0.18s ease-out",
        }}
      >
        <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          이 기록을 삭제할까요?
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
          삭제한 일기는 되돌릴 수 없어요.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "9px 0",
              backgroundColor: "transparent", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text)", fontSize: 13, cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "9px 0",
              backgroundColor: "#c0392b", border: "none",
              borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
