"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

type Props = { onClose: () => void };

export default function DeleteAccountModal({ onClose }: Props) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const backdropRef = { current: null as HTMLDivElement | null };

  const handleDelete = async () => {
    if (deleting || input !== "탈퇴합니다") return;
    setDeleting(true);
    try {
      const res = await apiFetch("/api/users", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut();
      router.replace("/login");
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (!deleting && e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "28px 24px", maxWidth: 340, width: "100%",
          animation: "modalIn 0.18s ease-out",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", marginBottom: 10 }}>정말 탈퇴하시겠어요?</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
          탈퇴하면 모든 청음 기록, 소감, 평점이 영구적으로 삭제됩니다.
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
          계속하려면 <span style={{ color: "var(--text)", fontWeight: 600 }}>탈퇴합니다</span>를 입력하세요.
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="탈퇴합니다"
          disabled={deleting}
          style={{
            width: "100%", boxSizing: "border-box",
            backgroundColor: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "8px 12px",
            color: "var(--text)", fontSize: 13, marginBottom: 20, outline: "none",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={deleting}
            style={{
              backgroundColor: "transparent", border: "1px solid var(--border)",
              color: "var(--text)", borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || input !== "탈퇴합니다"}
            style={{
              backgroundColor: "var(--error)", border: "none",
              color: "#fff", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600,
              cursor: (deleting || input !== "탈퇴합니다") ? "not-allowed" : "pointer",
              opacity: (deleting || input !== "탈퇴합니다") ? 0.4 : 1,
              fontFamily: "inherit", transition: "opacity 0.15s",
            }}
          >
            {deleting ? "처리 중..." : "탈퇴하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
