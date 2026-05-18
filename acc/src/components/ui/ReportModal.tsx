"use client";

import { useState } from "react";
import { useUsers } from "@/context/UsersContext";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/components/ui/Toast";
import FilterSelect from "@/components/ui/FilterSelect";

const REASONS = [
  "비매너 행동",
  "욕설 / 혐오 표현",
  "스팸 / 도배",
  "부적절한 콘텐츠",
  "기타",
] as const;

type Props = {
  onClose: () => void;
  defaultUserId?: string;
};

export default function ReportModal({ onClose, defaultUserId }: Props) {
  const { users } = useUsers();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [reportedUserId, setReportedUserId] = useState(defaultUserId ?? "");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const otherUsers = users.filter((u) => u.id !== profile?.id);

  const handleSubmit = async () => {
    if (!reportedUserId || !reason) return;
    if (reason === "기타" && !detail.trim()) {
      showToast("기타 사유를 직접 입력해주세요", "error");
      return;
    }
    setSubmitting(true);
    const res = await apiFetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId, reason, detail: detail.trim() || null }),
    });
    setSubmitting(false);
    if (res.ok) {
      showToast("신고가 접수됐습니다");
      onClose();
    } else {
      const data = await res.json();
      showToast(data.error ?? "신고 실패", "error");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 6,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 8,
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: 440,
        display: "flex", flexDirection: "column", gap: 20, padding: 28,
      }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, margin: 0 }}>멤버 신고</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 3 }}>접수된 신고는 어드민이 검토합니다</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* 멤버 선택 */}
        <div>
          <label style={labelStyle}>신고할 멤버</label>
          <FilterSelect
            value={reportedUserId}
            onChange={setReportedUserId}
            options={[
              { value: "", label: "멤버를 선택하세요" },
              ...otherUsers.map((u) => ({ value: u.id, label: `${u.display_name} (@${u.id})` })),
            ]}
            title="신고할 멤버"
            style={{ ...inputStyle, justifyContent: "space-between", cursor: "pointer" }}
          />
        </div>

        {/* 신고 사유 */}
        <div>
          <label style={labelStyle}>신고 사유</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {REASONS.map((r) => (
              <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  style={{ accentColor: "var(--accent)", width: 15, height: 15, flexShrink: 0 }}
                />
                <span style={{ color: "var(--text)", fontSize: 13 }}>{r}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 구체 사유 */}
        <div>
          <label style={labelStyle}>
            구체적 사유{" "}
            <span style={{ color: reason === "기타" ? "var(--error)" : "var(--text-muted)", fontWeight: 400 }}>
              {reason === "기타" ? "(필수)" : "(선택)"}
            </span>
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="어떤 문제가 있었는지 구체적으로 알려주세요"
            style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
          />
          {detail.length > 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4, textAlign: "right" }}>
              {detail.length}/300
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "transparent", border: "1px solid var(--border)",
              color: "var(--text)", borderRadius: 6, padding: "8px 18px", fontSize: 13, cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reportedUserId || !reason || submitting}
            style={{
              backgroundColor: "var(--error, #e05050)", border: "none", color: "#fff",
              borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600,
              cursor: !reportedUserId || !reason || submitting ? "not-allowed" : "pointer",
              opacity: !reportedUserId || !reason || submitting ? 0.4 : 1,
            }}
          >
            {submitting ? "접수 중..." : "신고 접수"}
          </button>
        </div>
      </div>
    </div>
  );
}
