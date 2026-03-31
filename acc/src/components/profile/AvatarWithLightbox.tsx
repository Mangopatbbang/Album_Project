"use client";

import { useState } from "react";

type Props = {
  avatarUrl: string | null;
  emoji: string;
  displayName: string;
};

export default function AvatarWithLightbox({ avatarUrl, emoji, displayName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => avatarUrl && setOpen(true)}
        style={{
          width: 72, height: 72, borderRadius: "50%",
          backgroundColor: "var(--bg-elevated)",
          border: "2px solid var(--border-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, overflow: "hidden", flexShrink: 0,
          cursor: avatarUrl ? "pointer" : "default",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => { if (avatarUrl) e.currentTarget.style.opacity = "0.8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        {avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ lineHeight: 1 }}>{emoji}</span>
        }
      </div>

      {open && avatarUrl && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={displayName}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(480px, 90vw)", maxHeight: "80dvh",
              borderRadius: 12, objectFit: "contain",
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              cursor: "default",
            }}
          />
        </div>
      )}
    </>
  );
}
