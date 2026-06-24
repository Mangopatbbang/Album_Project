"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

const ConstellationViewer = dynamic(() => import("@/components/profile/ConstellationViewer"), { ssr: false });

export default function ConstellationSection({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  if (profile?.id !== userId) return null;

  return (
    <>
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 4 }}>
            청음 별자리
          </p>
          <p style={{ color: "var(--text-sub)", fontSize: 12 }}>
            내가 들어온 앨범들의 우주
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          style={{
            backgroundColor: "var(--accent)", color: "var(--bg)",
            border: "none", borderRadius: 8,
            padding: "8px 16px", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            letterSpacing: "0.02em",
          }}
          className="hover:opacity-85 active:opacity-70 transition-opacity"
        >
          열기 →
        </button>
      </div>

      {open && <ConstellationViewer userId={userId} onClose={() => setOpen(false)} />}
    </>
  );
}
