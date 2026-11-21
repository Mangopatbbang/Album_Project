"use client";

// AlbumModal 하단 — 정보 오류 신고 + 문의 링크 (AlbumModal에서 분리, 동작 동일)
import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/components/ui/Toast";

type Props = {
  albumId: string;
  /** 로그인 상태일 때만 신고 UI 노출 */
  canReport: boolean;
};

export default function AlbumInfoReport({ albumId, canReport }: Props) {
  const { showToast } = useToast();
  const [infoReportOpen, setInfoReportOpen] = useState(false);
  const [infoReportDetail, setInfoReportDetail] = useState("");
  const [infoReportSubmitting, setInfoReportSubmitting] = useState(false);

  return (
    <div className="px-5 sm:px-8" style={{ paddingTop: 20, paddingBottom: 28 }}>
      {canReport && (
        <div style={{ marginBottom: 14 }}>
          {!infoReportOpen ? (
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => setInfoReportOpen(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, padding: 0 }}
                className="hover:text-[var(--text-sub)] transition-colors"
              >
                정보 오류 신고
              </button>
            </div>
          ) : (
            <div style={{
              padding: "12px 14px", borderRadius: 8,
              backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)",
            }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8 }}>
                어떤 정보가 잘못됐나요?
              </p>
              <textarea
                value={infoReportDetail}
                onChange={(e) => setInfoReportDetail(e.target.value.slice(0, 300))}
                placeholder="예: 장르가 틀렸어요 / 아티스트 표기가 달라요"
                style={{
                  width: "100%", boxSizing: "border-box",
                  backgroundColor: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: "8px 10px", fontSize: 12,
                  color: "var(--text)", resize: "none", outline: "none",
                  minHeight: 72, fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => { setInfoReportOpen(false); setInfoReportDetail(""); }}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  disabled={!infoReportDetail.trim() || infoReportSubmitting}
                  onClick={async () => {
                    if (!infoReportDetail.trim() || infoReportSubmitting) return;
                    setInfoReportSubmitting(true);
                    const res = await apiFetch("/api/reports/album", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ albumId, detail: infoReportDetail.trim() }),
                    });
                    setInfoReportSubmitting(false);
                    if (res.ok) {
                      showToast("신고가 접수됐어요. 검토 후 수정할게요.");
                      setInfoReportOpen(false);
                      setInfoReportDetail("");
                    } else {
                      showToast("신고 접수에 실패했어요", "error");
                    }
                  }}
                  style={{
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "5px 14px", fontSize: 11,
                    color: infoReportDetail.trim() ? "var(--text-sub)" : "var(--text-muted)",
                    cursor: infoReportDetail.trim() ? "pointer" : "not-allowed",
                    opacity: infoReportSubmitting ? 0.5 : 1,
                  }}
                >
                  {infoReportSubmitting ? "제출 중…" : "제출"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ textAlign: "center" }}>
        <Link
          href="/board"
          style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.02em" }}
          className="hover:text-[var(--text-sub)] transition-colors"
        >
          문제가 있나요? 문의하기 →
        </Link>
      </div>
    </div>
  );
}
