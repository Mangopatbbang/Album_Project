"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ReportModal from "@/components/ui/ReportModal";

export default function ReportUserButton({ targetUserId }: { targetUserId: string }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  // 비로그인 또는 자기 자신 프로필이면 숨김
  if (!profile || profile.id === targetUserId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="멤버 신고"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: "4px 6px",
          display: "flex",
          alignItems: "center",
          transition: "color 0.15s",
        }}
        className="hover:text-[var(--error)]"
      >
        {/* flag 아이콘 */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
          <line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
      </button>
      {open && (
        <ReportModal
          onClose={() => setOpen(false)}
          defaultUserId={targetUserId}
        />
      )}
    </>
  );
}
