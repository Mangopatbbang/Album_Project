"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { useNotifications } from "@/context/NotificationsContext";

type Tab = "account" | "moderation";

type Props = {
  onClose: () => void;
  defaultTab?: Tab;
};

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

export default function SettingsModal({ onClose, defaultTab = "account" }: Props) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { notifications } = useNotifications();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const mouseDownRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const moderationHistory = notifications.filter((n) =>
    MODERATION_TYPES.includes(n.type as typeof MODERATION_TYPES[number])
  );

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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    color: active ? "var(--text)" : "var(--text-muted)",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    cursor: "pointer",
    transition: "color 0.15s",
    fontFamily: "inherit",
    flexShrink: 0,
  });

  return (
    <div
      ref={backdropRef}
      style={{ position: "fixed", inset: 0, zIndex: 300, backgroundColor: "rgba(0,0,0,0.7)" }}
      className="flex items-center justify-center p-4"
      onMouseDown={(e) => { mouseDownRef.current = e.target === backdropRef.current; }}
      onMouseUp={(e) => { if (mouseDownRef.current && e.target === backdropRef.current) onClose(); mouseDownRef.current = false; }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 400,
          maxHeight: "80dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalIn 0.18s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px 0", flexShrink: 0,
        }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>설정</p>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: "0 2px" }}
          >
            ×
          </button>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", paddingLeft: 8, flexShrink: 0 }}>
          <button style={tabStyle(tab === "account")} onClick={() => setTab("account")}>계정</button>
          <button style={tabStyle(tab === "moderation")} onClick={() => setTab("moderation")}>
            제재 이력
            {moderationHistory.length > 0 && (
              <span style={{
                marginLeft: 5, fontSize: 10, fontWeight: 700,
                color: "var(--bg)", backgroundColor: "var(--error)",
                borderRadius: 4, padding: "1px 5px",
              }}>
                {moderationHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* 탭 내용 */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {tab === "account" && (
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => { onClose(); signOut(); }}
                  style={{
                    width: "100%", padding: "12px 16px", textAlign: "left",
                    background: "none", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text)", fontSize: 13,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "background-color 0.12s",
                  }}
                  className="hover:bg-[var(--bg-elevated)]"
                >
                  로그아웃
                </button>

                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    style={{
                      width: "100%", padding: "12px 16px", textAlign: "left",
                      background: "none", border: "1px solid rgba(var(--error-rgb), 0.3)",
                      borderRadius: 8, color: "var(--error)", fontSize: 13,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "background-color 0.12s",
                    }}
                    className="hover:bg-[var(--bg-elevated)]"
                  >
                    계정 탈퇴
                  </button>
                ) : (
                  <div style={{
                    border: "1px solid rgba(var(--error-rgb), 0.3)",
                    borderRadius: 8, padding: 16,
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                      탈퇴하면 모든 청음 기록, 소감, 평점이 <span style={{ color: "var(--error)", fontWeight: 600 }}>영구 삭제</span>됩니다.
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      계속하려면 <span style={{ color: "var(--text)", fontWeight: 600 }}>탈퇴합니다</span>를 입력하세요.
                    </p>
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="탈퇴합니다"
                      disabled={deleting}
                      style={{
                        backgroundColor: "var(--bg)", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "8px 12px",
                        color: "var(--text)", fontSize: 13, outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
                        disabled={deleting}
                        style={{
                          flex: 1, padding: "8px 0", background: "none",
                          border: "1px solid var(--border)", borderRadius: 6,
                          color: "var(--text)", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        취소
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteInput !== "탈퇴합니다"}
                        style={{
                          flex: 1, padding: "8px 0",
                          backgroundColor: "var(--error)", border: "none",
                          borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600,
                          cursor: (deleting || deleteInput !== "탈퇴합니다") ? "not-allowed" : "pointer",
                          opacity: (deleting || deleteInput !== "탈퇴합니다") ? 0.4 : 1,
                          fontFamily: "inherit", transition: "opacity 0.15s",
                        }}
                      >
                        {deleting ? "처리 중..." : "탈퇴하기"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "moderation" && (
            <div style={{ padding: "16px 20px" }}>
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
                        <div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color,
                            backgroundColor: `${color}18`,
                            border: `1px solid ${color}40`,
                            borderRadius: 4, padding: "2px 7px",
                          }}>
                            {label}
                          </span>
                          {n.albumTitle && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, opacity: 0.7 }}>
                              {n.albumTitle}
                            </p>
                          )}
                        </div>
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
          )}
        </div>
      </div>
    </div>
  );
}
