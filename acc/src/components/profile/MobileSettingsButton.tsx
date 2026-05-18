"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { captureElement } from "@/lib/capture";
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);

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

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
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
                background: "none", border: "none",
                cursor: "pointer", color: "#e05050", fontSize: 15, textAlign: "left",
              }}
            >
              로그아웃
            </button>
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
