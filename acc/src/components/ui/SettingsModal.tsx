"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/context/NotificationsContext";

const MODERATION_TYPES = [
  "moderation_warning",
  "moderation_ban_temp",
  "moderation_ban_permanent",
  "report_reviewed",
  "report_ban",
] as const;

const MODERATION_LABELS: Record<string, string> = {
  moderation_warning: "경고",
  moderation_ban_temp: "임시 이용 정지",
  moderation_ban_permanent: "영구 이용 정지",
  report_reviewed: "신고 확인 처리",
  report_ban: "신고 처리 완료",
};

const MODERATION_COLORS: Record<string, string> = {
  moderation_warning: "#e0a030",
  moderation_ban_temp: "#e05050",
  moderation_ban_permanent: "#e05050",
  report_reviewed: "var(--accent)",
  report_ban: "var(--accent)",
};

type Props = { onClose: () => void };

export default function SettingsModal({ onClose }: Props) {
  const { notifications } = useNotifications();
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const doClose = () => { setClosing(true); setTimeout(onClose, 160); };

  const moderationHistory = notifications.filter((n) =>
    MODERATION_TYPES.includes(n.type as typeof MODERATION_TYPES[number])
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      ref={backdropRef}
      style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.7)", animation: closing ? "backdropOut 0.16s ease-in forwards" : "backdropIn 0.18s ease-out" }}
      className="flex items-center justify-center p-4"
      onMouseDown={(e) => { mouseDownRef.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => { if (mouseDownRef.current && e.target === backdropRef.current) doClose(); mouseDownRef.current = false; }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 14, width: "100%", maxWidth: 400,
          maxHeight: "70dvh", display: "flex", flexDirection: "column",
          overflow: "hidden", animation: closing ? "modalOut 0.16s ease-in forwards" : "modalIn 0.18s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>제재 이력</p>
          <button
            onClick={doClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: "0 2px" }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>
          {moderationHistory.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "24px 0", opacity: 0.6 }}>
              제재 이력이 없어요
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {moderationHistory.map((n) => {
                const d = new Date(n.createdAt);
                const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
                const label = MODERATION_LABELS[n.type] ?? n.type;
                const color = MODERATION_COLORS[n.type] ?? "var(--text-muted)";
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                    }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 700, color,
                      backgroundColor: `${color}18`,
                      border: `1px solid ${color}40`,
                      borderRadius: 4, padding: "2px 7px",
                    }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{dateStr}</span>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.6, opacity: 0.7 }}>
                이의 신청은 처리일로부터 7일 이내 게시판을 통해 접수할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
