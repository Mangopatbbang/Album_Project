"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { captureElement } from "@/lib/capture";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import ProfileEditButton from "./ProfileEditButton";

type Props = {
  userId: string;
  initialDisplayName: string;
  initialEmoji: string;
  initialAvatarUrl: string | null;
  initialBio?: string | null;
};

export default function MobileSettingsButton({ userId, initialDisplayName, initialEmoji, initialAvatarUrl, initialBio }: Props) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!profile || profile.id !== userId) return null;

  const handleCapture = async () => {
    setSheetOpen(false);
    const el = document.getElementById("profile-card");
    if (!el || capturing) return;
    setCapturing(true);
    await captureElement(el);
    setCapturing(false);
  };

  const handleEditClick = () => {
    setSheetOpen(false);
    setEditOpen(true);
  };

  const handleLogout = () => {
    setSheetOpen(false);
    signOut();
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await apiFetch("/api/users", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut();
      router.replace("/login");
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        data-tour="profile-edit"
        className="sm:hidden"
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "4px 10px",
          cursor: "pointer",
          color: "var(--text)",
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        설정
      </button>

      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{
            position: "fixed", inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
            zIndex: 300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0,
              backgroundColor: "var(--bg-elevated)",
              borderTop: "1px solid var(--border)",
              borderRadius: "16px 16px 0 0",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
              animation: "sheetIn 0.26s cubic-bezier(0.22, 1, 0.36, 1)",
              zIndex: 301,
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-light)" }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", padding: "4px 20px 10px", textTransform: "uppercase", margin: 0 }}>
              설정
            </p>

            <button
              onClick={handleEditClick}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", padding: "16px 20px",
                background: "none", border: "none", borderBottom: "1px solid var(--border)",
                cursor: "pointer", color: "var(--text)", fontSize: 15, textAlign: "left",
              }}
            >
              프로필 편집
            </button>

            <button
              onClick={handleCapture}
              disabled={capturing}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", padding: "16px 20px",
                background: "none", border: "none", borderBottom: "1px solid var(--border)",
                cursor: capturing ? "default" : "pointer",
                color: capturing ? "var(--text-muted)" : "var(--text)",
                fontSize: 15, textAlign: "left",
                opacity: capturing ? 0.6 : 1,
              }}
            >
              {capturing ? "캡처 중..." : "프로필 캡처"}
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", padding: "16px 20px",
                background: "none", border: "none", borderBottom: "1px solid var(--border)",
                cursor: "pointer", color: "#e05050", fontSize: 15, textAlign: "left",
              }}
            >
              로그아웃
            </button>

            <button
              onClick={() => { setSheetOpen(false); setDeleteConfirm(true); }}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", padding: "14px 20px",
                background: "none", border: "none",
                cursor: "pointer", color: "var(--text-muted)", fontSize: 13, textAlign: "left",
              }}
            >
              계정 탈퇴
            </button>
          </div>
        </div>
      )}

      {/* 계정 탈퇴 확인 다이얼로그 */}
      {deleteConfirm && (
        <div
          onClick={() => { if (!deleting) { setDeleteConfirm(false); setDeleteInput(""); } }}
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
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 20 }}>
              탈퇴하면 모든 청음 기록, 소감, 평점이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              계속하려면 아래에 <span style={{ color: "var(--text)", fontWeight: 600 }}>탈퇴합니다</span>를 입력하세요.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="탈퇴합니다"
              disabled={deleting}
              style={{
                width: "100%", boxSizing: "border-box",
                backgroundColor: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 6, padding: "8px 12px",
                color: "var(--text)", fontSize: 13,
                marginBottom: 20, outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
                disabled={deleting}
                style={{
                  backgroundColor: "transparent", border: "1px solid var(--border)",
                  color: "var(--text)", borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteInput !== "탈퇴합니다"}
                style={{
                  backgroundColor: "#e05050", border: "none",
                  color: "#fff", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600,
                  cursor: (deleting || deleteInput !== "탈퇴합니다") ? "not-allowed" : "pointer",
                  opacity: (deleting || deleteInput !== "탈퇴합니다") ? 0.4 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {deleting ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileEditButton
        userId={userId}
        initialDisplayName={initialDisplayName}
        initialEmoji={initialEmoji}
        initialAvatarUrl={initialAvatarUrl}
        initialBio={initialBio}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
