"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";

type Announcement = {
  id: number;
  content: string;
  show_popup: boolean;
  created_at: string;
};

type Inquiry = {
  id: number;
  content: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const cardStyle = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
};

const inputStyle = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
} as const;

const labelStyle = {
  color: "var(--text-muted)",
  fontSize: 11,
  fontWeight: 600 as const,
  letterSpacing: "0.06em",
  display: "block" as const,
  marginBottom: 6,
};

export default function BoardClient() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isAdmin = profile?.role === "admin";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // 공지 작성 폼
  const [noticeContent, setNoticeContent] = useState("");
  const [noticePopup, setNoticePopup] = useState(false);
  const [savingNotice, setSavingNotice] = useState(false);

  // 문의 폼
  const [inquiryContent, setInquiryContent] = useState("");
  const [inquiryName, setInquiryName] = useState("");
  const [savingInquiry, setSavingInquiry] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch("/api/notices");
    if (res.ok) setAnnouncements(await res.json());
  }, []);

  const fetchInquiries = useCallback(async () => {
    if (!isAdmin || !profile) return;
    const res = await fetch(`/api/inquiries?userId=${profile.id}`);
    if (res.ok) setInquiries(await res.json());
  }, [isAdmin, profile]);

  useEffect(() => {
    Promise.all([fetchAnnouncements(), fetchInquiries()]).finally(() => setLoadingData(false));
  }, [fetchAnnouncements, fetchInquiries]);

  const handlePostNotice = async () => {
    if (!noticeContent.trim() || !profile) return;
    setSavingNotice(true);
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noticeContent, show_popup: noticePopup, userId: profile.id }),
    });
    setSavingNotice(false);
    if (res.ok) {
      setNoticeContent("");
      setNoticePopup(false);
      showToast("공지를 등록했어요");
      fetchAnnouncements();
    }
  };

  const handleTogglePopup = async (a: Announcement) => {
    if (!profile) return;
    const res = await fetch(`/api/notices/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_popup: !a.show_popup, userId: profile.id }),
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.map((x) => x.id === a.id ? { ...x, show_popup: !x.show_popup } : x));
    }
  };

  const handleDeleteNotice = async (id: number) => {
    if (!profile || !confirm("공지를 삭제할까요?")) return;
    const res = await fetch(`/api/notices/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id }),
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("공지를 삭제했어요", "info");
    }
  };

  const handleSubmitInquiry = async () => {
    if (!inquiryContent.trim()) return;
    if (!profile && !inquiryName.trim()) {
      showToast("이름을 입력해주세요", "error");
      return;
    }
    setSavingInquiry(true);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: inquiryContent,
        author_id: profile?.id || null,
        author_name: profile ? profile.display_name : inquiryName,
      }),
    });
    setSavingInquiry(false);
    if (res.ok) {
      setInquiryContent("");
      setInquiryName("");
      showToast("문의를 남겼어요");
      if (isAdmin) fetchInquiries();
    }
  };

  if (loadingData) {
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>불러오는 중...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 100px" }}>

      {/* 페이지 타이틀 */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.03em" }}>
          청음판
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
          공지사항 및 문의 게시판
        </p>
      </div>

      {/* ── 공지사항 ── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
            공지사항
          </p>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{announcements.length}건</span>
        </div>

        {/* 관리자 공지 작성 */}
        {isAdmin && (
          <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 12 }}>
            <p style={{ ...labelStyle, marginBottom: 10 }}>새 공지 작성</p>
            <textarea
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
              rows={3}
              placeholder="공지 내용을 입력하세요"
              style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={noticePopup}
                  onChange={(e) => setNoticePopup(e.target.checked)}
                  style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
                />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>홈 팝업으로 띄우기</span>
              </label>
              <button
                onClick={handlePostNotice}
                disabled={savingNotice || !noticeContent.trim()}
                style={{
                  backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
                  borderRadius: 6, padding: "6px 16px", fontSize: 13, fontWeight: 600,
                  cursor: savingNotice || !noticeContent.trim() ? "not-allowed" : "pointer",
                  opacity: savingNotice || !noticeContent.trim() ? 0.4 : 1,
                }}
              >
                {savingNotice ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        )}

        {/* 공지 목록 */}
        {announcements.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "20px 0" }}>등록된 공지가 없습니다.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {announcements.map((a) => (
              <div
                key={a.id}
                style={{
                  ...cardStyle,
                  padding: "16px 20px",
                  borderLeft: `3px solid ${a.show_popup ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                <p style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {a.content}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatDate(a.created_at)}</span>
                    {a.show_popup && (
                      <span style={{
                        color: "var(--accent)", fontSize: 10, fontWeight: 600,
                        backgroundColor: "rgba(232,213,163,0.1)", border: "1px solid rgba(232,213,163,0.3)",
                        borderRadius: 4, padding: "1px 6px", letterSpacing: "0.04em",
                      }}>
                        팝업
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleTogglePopup(a)}
                        style={{
                          background: "none", border: "1px solid var(--border)", borderRadius: 4,
                          color: a.show_popup ? "var(--accent)" : "var(--text-muted)",
                          fontSize: 11, padding: "2px 8px", cursor: "pointer",
                        }}
                      >
                        {a.show_popup ? "팝업 해제" : "팝업 설정"}
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(a.id)}
                        style={{
                          background: "none", border: "1px solid var(--border)", borderRadius: 4,
                          color: "var(--text-muted)", fontSize: 11, padding: "2px 8px", cursor: "pointer",
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 문의하기 ── */}
      <section>
        <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>
          문의하기
        </p>

        {/* 관리자 문의 목록 */}
        {isAdmin && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10 }}>
              문의 목록 — {inquiries.length}건
            </p>
            {inquiries.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>접수된 문의가 없습니다.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {inquiries.map((q) => (
                  <div key={q.id} style={{ ...cardStyle, padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{
                        color: "var(--accent)", fontSize: 11, fontWeight: 600,
                        backgroundColor: "rgba(232,213,163,0.1)", border: "1px solid rgba(232,213,163,0.2)",
                        borderRadius: 4, padding: "1px 8px",
                      }}>
                        {q.author_name ?? "익명"}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{formatDate(q.created_at)}</span>
                    </div>
                    <p style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {q.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ height: 1, backgroundColor: "var(--border)", marginBottom: 24 }} />
          </div>
        )}

        {/* 문의 작성 폼 */}
        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <p style={{ ...labelStyle, marginBottom: 14 }}>문의 남기기</p>
          {!profile && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>이름</label>
              <input
                value={inquiryName}
                onChange={(e) => setInquiryName(e.target.value)}
                placeholder="이름을 입력하세요"
                style={inputStyle}
              />
            </div>
          )}
          {profile && (
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 12 }}>
              {profile.emoji} {profile.display_name} 으로 제출됩니다
            </p>
          )}
          <textarea
            value={inquiryContent}
            onChange={(e) => setInquiryContent(e.target.value)}
            rows={4}
            placeholder="불편한 점, 궁금한 점, 건의사항을 자유롭게 남겨주세요"
            style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmitInquiry}
              disabled={savingInquiry || !inquiryContent.trim()}
              style={{
                backgroundColor: "var(--accent)", border: "none", color: "var(--bg)",
                borderRadius: 6, padding: "7px 20px", fontSize: 13, fontWeight: 600,
                cursor: savingInquiry || !inquiryContent.trim() ? "not-allowed" : "pointer",
                opacity: savingInquiry || !inquiryContent.trim() ? 0.4 : 1,
              }}
            >
              {savingInquiry ? "제출 중..." : "문의하기"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
