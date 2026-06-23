"use client";

import { useState } from "react";
import ProfileShareModal, { type ProfileCardData } from "@/components/profile/ProfileShareModal";

export default function ProfileCaptureButton({ data }: { data: ProfileCardData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="프로필 카드 공유"
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "4px 10px",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 5,
          flexShrink: 0,
          transition: "color 0.15s",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="4" /><line x1="8.5" y1="2" x2="8.5" y2="4" />
        </svg>
        공유
      </button>

      {open && <ProfileShareModal {...data} onClose={() => setOpen(false)} />}
    </>
  );
}
